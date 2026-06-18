# Rancangan app/api/aio-generate/route.ts

Dokumen ini adalah rancangan kerangka Route Handler untuk mengorkestrasi 7 prompt builder + 7 parser dari `lib/prompt-aio.ts` dan `lib/aio-parser.ts`. Tujuan: 1 endpoint yang menerima 1 keyword + 1 model, lalu menghasilkan artikel AI Overview lengkap + JSON-LD + meta, siap publish ke WordPress.

## Prinsip Desain

1. **Paralel dengan `app/api/generate/route.ts`** - pakai `requireAuth()`, `deduct_credits` RPC, pola provider call yang sama. Tidak ada duplikasi logika auth/billing.
2. **Sequential pipeline** - 7 prompt berurutan karena saling dependensi. Hanya Prompt 3 yang di-loop 10x secara internal.
3. **Idempotent billing** - kredit dipotong 1x di awal (sebelum Prompt 1), bukan per prompt. Kalau中途 gagal, kredit hangus (sama dengan route existing) - design decision konsisten.
4. **Observability** - setiap step log ke console + dikembalikan ke client di `step_logs[]` untuk debugging UI.
5. **Graceful degradation** - kalau Prompt 4 (critique) gagal total, Prompt 5 (refinement) diskip, artikel v1 tetap dipakai dan lanjut ke Prompt 6/7. Kalau Prompt 6 (schema) gagal, fallback parser dipanggil - JSON-LD minimal tetap ada. Kalau Prompt 7 (meta) gagal, pakai title/slug/meta dari outline Prompt 2.
6. **Timeout safety** - setiap step diberi timeout budget. Total budget ~85 detik (maxDuration = 90 di Next config existing).

## Struktur File

```
app/api/aio-generate/route.ts
+- Bagian 1: Tipe internal (StepLog, AioGenerateRequest, AioGenerateResponse)
+- Bagian 2: Konstanta (timeout per step, default word target, maxDuration)
+- Bagian 3: Helper internal (runStep, callProvider, logStep)
+- Bagian 4: 7 step function (step1Research, step2Outline, step3Blocks, step4Critique, step5Refinement, step6Schema, step7Meta)
+- Bagian 5: Orchestrator utama runAioPipeline()
+- Bagian 6: POST() handler - validasi request, auth, billing, return response
```

## 1. Tipe Internal

```ts
/** Log per step untuk debugging UI. */
export interface StepLog {
  step: number;                   // 1-7
  name: string;                   // "research", "outline", "blocks", "critique", "refinement", "schema", "meta"
  status: "success" | "fallback" | "error" | "skipped";
  durationMs: number;
  model: string;                  // modelId yang dipakai
  providerId: string;
  bytesIn: number;                // raw input dari API
  bytesOut: number;               // raw output dari API
  attemptSuccess: boolean;        // parse() success
  usedFallback: boolean;           // parseMarkdownFallback() terpakai
  error: string | null;
  notes: string[];                // pesan tambahan (misal: "5/10 blok pakai fallback")
}

/** Request body dari client. */
export interface AioGenerateRequest {
  // Wajib
  keyword: string;
  primaryKeyword: string;
  modelId: string;                // dari MODELS di constants
  language?: string;              // default "Indonesia"
  tone?: string;                  // default dari TONES[0]
  pov?: string;                   // default dari POVS[0]
  readability?: string;           // default dari READABILITY[0]
  articleType?: string;           // default "Blog Post"
  wordTarget?: number;            // default 1600
  brandName: string;              // wajib
  targetAudience: string;         // wajib
  geo?: string;                   // default "Indonesia"
  publishDate?: string;           // default hari ini ISO

  // Opsional
  secondaryKeywords?: string[];
  brandVoice?: string;
  brandRestrictions?: string;
  mustMention?: string;
  bannedSources?: string[];
  recencyMarker?: string;
  userTitle?: string;
  userOutlineOverride?: string;
  internalLinkBaseUrl?: string;
  allowedExternalDomains?: string[];
  authorName?: string;
  authorBio?: string;
  lastUpdated?: string;

  // Flag kontrol pipeline
  skipCritique?: boolean;         // skip Prompt 4 + 5 (hemat waktu + token)
  skipRefinement?: boolean;       // skip Prompt 5 saja
  enableImages?: boolean;         // TODO iterasi berikutnya
}

/** Response final ke client. */
export interface AioGenerateResponse {
  // Wrapper ringkas untuk dashboard.
  success: boolean;
  fullMarkdown: string;           // artikel utuh
  fullHtml: string;               // hasil marked()
  schemas: AioSchemaOutput;
  meta: AioMetaOutput;
  qaScore: number;                // 0-100
  creditsUsed: number;

  // Detail per step untuk debugging.
  stepLogs: StepLog[];
  brief: AioBriefOutput;
  outline: AioOutlineOutput;
  blocks: AioBlockOutput[];
  critique: AioCritiqueOutput | null;
  refinement: AioRefinementOutput | null;

  // Pesan user-friendly.
  warnings: string[];
  error: string | null;
}
```

## 2. Konstanta

```ts
const DEFAULT_WORD_TARGET = 1600;
const DEFAULT_TEMPERATURE_BY_STEP: Record<number, number> = {
  // (sudah ada di masing-masing builder, tapi untuk timeout budgeting)
};
const STEP_TIMEOUT_MS: Record<number, number> = {
  1: 20_000,   // research
  2: 25_000,   // outline
  3: 60_000,   // blocks (10x sequential, ~6s per call)
  4: 25_000,   // critique
  5: 30_000,   // refinement
  6: 20_000,   // schema
  7: 15_000,   // meta
};
// Total maks: 20+25+60+25+30+20+15 = 195 detik
// maxDuration route: 180 (di-set di export const maxDuration)
// Realistic dengan retry: ~120-150 detik untuk artikel 1600 kata.
```

## 3. Helper Internal

```ts
/** Jalankan 1 step: build prompt, call API, parse response, log ke StepLog. */
async function runStep<T>(
  ctx: PipelineContext,
  stepNumber: number,
  stepName: string,
  buildPromptFn: () => AioPrompt,
  parser: AioParser<T>,
  signal: AbortSignal,
): Promise<{ data: T | null; log: StepLog }>;

/** Panggil API provider sesuai AioPrompt + AioProviderId. Return raw string. */
async function callProvider(
  prompt: AioPrompt,
  providerId: AioProviderId,
  apiKey: string,
  signal: AbortSignal,
): Promise<string>;

/** Catat step log. */
function makeStepLog(...): StepLog;
```

## 4. 7 Step Function

```ts
async function step1Research(ctx): Promise<AioBriefOutput>;
async function step2Outline(ctx, brief): Promise<AioOutlineOutput>;
async function step3Blocks(ctx, outline): Promise<AioBlockOutput[]>;   // LOOP 10x
async function step4Critique(ctx, fullMarkdown): Promise<AioCritiqueOutput | null>;
async function step5Refinement(ctx, fullMarkdown, critique, outline, brief): Promise<AioRefinementOutput | null>;
async function step6Schema(ctx, fullMarkdown, outline, brief): Promise<AioSchemaOutput>;
async function step7Meta(ctx, fullMarkdown, outline, brief): Promise<AioMetaOutput>;
```

### step3Blocks - detail loop 10x

```ts
async function step3Blocks(ctx, outline): Promise<AioBlockOutput[]> {
  const blocks: AioBlockOutput[] = [];
  let accumulated = "";
  const prevBlocksText: string[] = [];   // rolling buffer

  for (let i = 1; i <= 10; i++) {
    const blockSpec = outline.outline[i - 1];
    const nextBlockTitles = outline.outline
      .slice(i, i + 2)   // judul 2 blok setelahnya
      .map(b => b.h2 || b.name);

    const prevText = prevBlocksText.join("\n\n").slice(-3000);  // rolling context

    const prompt = buildBlockPrompt({
      input: ctx.input, model: ctx.model, providerId: ctx.providerId, caps: ctx.caps,
      outline, blockIndex: i, blockSpec,
      prevBlocksText: prevText,
      nextBlockTitles,
    });

    const { data, log } = await runStep(ctx, 3, "blocks", () => prompt, blockParser, ctx.signal);
    if (!data) {
      // Pakai fallback: wrap rawText jadi content_markdown
      // (runStep sudah handle ini, return AioBlockOutput via parseMarkdownFallback)
    }
    blocks.push(data!);
    accumulated += ((data!.h2 ? `## ${data!.h2}\n\n` : "") + data!.content_markdown + "\n\n");
    prevBlocksText.push(((data!.h2 ? `## ${data!.h2}\n\n` : "") + data!.content_markdown));
  }
  return blocks;
}
```

## 5. Orchestrator runAioPipeline()

```ts
async function runAioPipeline(req: AioGenerateRequest, userId: string, signal: AbortSignal): Promise<AioGenerateResponse> {
  const warnings: string[] = [];
  const stepLogs: StepLog[] = [];

  // Resolve model + provider + caps dari MODELS registry existing.
  const model = MODELS.find(m => m.id === req.modelId) ?? MODELS[0];
  const providerId = resolveProviderId(model);
  const caps = PROVIDER_CAPS[providerId];

  // Susun AioInput dari request.
  const input: AioInput = { ...req, publishDate: req.publishDate || new Date().toISOString().slice(0, 10) };

  const ctx: PipelineContext = { input, model, providerId, caps, userId, signal };

  // Step 1: Research
  const { data: brief, log: log1 } = await runStep(ctx, 1, "research",
    () => buildResearchPrompt({ input, model, providerId, caps }), briefParser, signal);
  stepLogs.push(log1);
  if (!brief) {
    return fail("Research gagal - brief kosong", stepLogs);
  }

  // Step 2: Outline
  const { data: outline, log: log2 } = await runStep(ctx, 2, "outline",
    () => buildOutlinePrompt({ input, model, providerId, caps, brief }),
    outlineParser, signal);
  stepLogs.push(log2);
  if (!outline) {
    return fail("Outline gagal - outline kosong", stepLogs);
  }

  // Step 3: Blocks (loop 10x)
  const blocks = await step3Blocks(ctx, outline);
  // Ambil 10 step log untuk blocks dari ctx.blockStepLogs

  // Susun fullMarkdown dari blocks.
  const fullMarkdown = blocks
    .sort((a, b) => a.block_index - b.block_index)
    .map(b => (b.h2 ? `## ${b.h2}\n\n` : "") + b.content_markdown)
    .join("\n\n");

  // Hitung word count total.
  const wordCount = fullMarkdown.replace(/[#*_>`]/g, " ").split(/\s+/).filter(Boolean).length;

  // Step 4: Critique (skip jika user minta)
  let critique: AioCritiqueOutput | null = null;
  if (!req.skipCritique) {
    const { data, log } = await runStep(ctx, 4, "critique",
      () => buildCritiquePrompt({ input, model, providerId, caps, outline, fullArticleMarkdown: fullMarkdown }),
      critiqueParser, signal);
    critique = data;
    stepLogs.push(log);
    if (!data) {
      warnings.push("Critique gagal - artikel lanjut tanpa quality gate check");
    }
  } else {
    stepLogs.push(makeSkippedLog(4, "critique", "skipCritique flag"));
  }

  // Step 5: Refinement (skip jika tidak ada rewrite_targets ATAU user minta skip)
  let refinement: AioRefinementOutput | null = null;
  let finalMarkdown = fullMarkdown;
  if (!req.skipRefinement && critique && critique.rewrite_targets.length > 0) {
    const { data, log } = await runStep(ctx, 5, "refinement",
      () => buildRefinementPrompt({ input, model, providerId, caps, outline, brief, fullArticleMarkdown: fullMarkdown, critique, rewriteTargets: critique.rewrite_targets }),
      refinementParser, signal);
    refinement = data;
    stepLogs.push(log);
    if (data && data.is_refined && data.refined_markdown) {
      finalMarkdown = data.refined_markdown;
    } else {
      warnings.push("Refinement tidak menghasilkan perubahan - artikel v1 dipakai");
    }
  } else {
    const reason = req.skipRefinement
      ? "skipRefinement flag"
      : !critique ? "no critique" : "no rewrite_targets (semua 13 poin lulus)";
    stepLogs.push(makeSkippedLog(5, "refinement", reason));
  }

  // Step 6: Schema
  const { data: schemas, log: log6 } = await runStep(ctx, 6, "schema",
    () => buildSchemaPrompt({ input, model, providerId, caps, outline, brief, fullArticleMarkdown: finalMarkdown }),
    schemaParser, signal);
  stepLogs.push(log6);
  if (!schemas) {
    return fail("Schema gagal - tidak ada JSON-LD", stepLogs);
  }

  // Step 7: Meta
  const { data: meta, log: log7 } = await runStep(ctx, 7, "meta",
    () => buildMetaPrompt({ input, model, providerId, caps, outline, brief, fullArticleMarkdown: finalMarkdown }),
    metaParser, signal);
  stepLogs.push(log7);
  if (!meta) {
    return fail("Meta gagal - tidak ada title/slug/meta", stepLogs);
  }

  // Konversi Markdown -> HTML via marked (dependency sudah ada di package.json).
  const fullHtml = await marked.parse(finalMarkdown);

  // qaScore: dari critique jika ada, jika tidak hitung dari wordCount.
  const qaScore = critique ? critique.qa_score : Math.min(100, Math.round((wordCount / 1200) * 100));

  return {
    success: true,
    fullMarkdown: finalMarkdown,
    fullHtml,
    schemas,
    meta,
    qaScore,
    creditsUsed: model.credits,
    stepLogs,
    brief, outline, blocks, critique, refinement,
    warnings,
    error: null,
  };
}
```

## 6. POST() Handler

```ts
export const runtime = "nodejs";
export const maxDuration = 180;   // 3 menit, sesuai step budget

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // 1. Auth - pakai requireAuth() existing.
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const userId = user.id;

  // 2. Parse + validasi body.
  let body: AioGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  if (!body.keyword || !body.primaryKeyword || !body.modelId || !body.brandName || !body.targetAudience) {
    return NextResponse.json({ error: "Field wajib: keyword, primaryKeyword, modelId, brandName, targetAudience" }, { status: 400 });
  }

  // 3. Validasi modelId - whitelist.
  const model = MODELS.find(m => m.id === body.modelId);
  if (!model) {
    return NextResponse.json({ error: `Model tidak dikenal: ${body.modelId}` }, { status: 400 });
  }

  // 4. Cek kredit + deduct (sama dengan route existing).
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: userData } = await supabase.from("users").select("credits, plan, plan_expires_at, role").eq("id", userId).single();
  if (!userData) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const isAdmin = userData.role === "admin";
  const planIsActive = isAdmin || !userData.plan_expires_at || new Date(userData.plan_expires_at) > new Date();
  const effectivePlan = isAdmin ? "pro" : (userData.plan && userData.plan !== "free" && planIsActive) ? userData.plan : "free";
  const isFree = effectivePlan === "free";
  const cost = isFree ? FREE_ARTICLE_COST : (CREDIT_COST[body.modelId] ?? 1);

  if (!isAdmin) {
    const { data: deduct, error: rpcError } = await supabase.rpc("deduct_credits", { p_user_id: userId, p_amount: cost });
    if (rpcError) {
      if ((userData.credits ?? 0) < cost) {
        return NextResponse.json({ error: `Kredit tidak cukup. Butuh ${cost}, punya ${userData.credits ?? 0}.` }, { status: 402 });
      }
      // Fallback update
      await supabase.from("users").update({ credits: userData.credits - cost, credits_used: (userData.credits_used ?? 0) + cost, articles_used: (userData.articles_used ?? 0) + 1 }).eq("id", userId);
    } else {
      const r = deduct as { success: boolean; credits: number } | null;
      if (!r?.success) {
        return NextResponse.json({ error: `Kredit tidak cukup. Butuh ${cost}, punya ${r?.credits ?? 0}.` }, { status: 402 });
      }
    }
  }

  // 5. Setup AbortController + jalankan pipeline.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 175_000);  // 5 detik buffer sebelum maxDuration
  req.signal.addEventListener("abort", () => controller.abort());

  let response: AioGenerateResponse;
  try {
    response = await runAioPipeline(body, userId, controller.signal);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Pipeline gagal: ${msg}`, stepLogs: [] }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }

  // 6. Simpan ke tabel aio_articles (migration baru, TODO).
  // await supabase.from("aio_articles").insert({ user_id: userId, payload_json: response, qa_score: response.qaScore, ... });

  // 7. Log durasi total.
  const totalMs = Date.now() - startedAt;
  console.log(`[aio-generate] user=${userId} model=${model.id} duration=${totalMs}ms steps=${response.stepLogs.length} qa=${response.qaScore}`);

  return NextResponse.json(response);
}
```

## Catatan untuk Iterasi Berikutnya

- **Simpan ke DB**: tabel `aio_articles` belum ada - migration `supabase/migrations/20260618_aio_articles.sql` perlu dibuat dengan field `payload_json jsonb`, `qa_score int`, `brief jsonb`, `outline jsonb`, `blocks jsonb`, `critique jsonb`, `refinement jsonb`, `schemas jsonb`, `meta jsonb`, `full_html text`, `word_count int`, `reading_time_min int`, `model_id text`, `provider_id text`, `user_id uuid`, `created_at`, `updated_at`.
- **Tiptap Editor integration**: `fullHtml` adalah string siap render. Tiptap bisa load via `editor.commands.setContent(html)`. Schema preview di sidebar tinggal render `schemas.schema_block_html` di `<div dangerouslySetInnerHTML>`.
- **WordPress publish**: existing `publishToWordPress()` di `lib/api.ts` bisa dipakai ulang - tinggal kirim `post.content = fullHtml`, `post.title = meta.title`, `post.slug = meta.slug`, `post.status = "publish"`. Tambah field `post.schema_block_html` jika plugin WP support custom field.
- **Streaming progress**: kalau mau kirim progress real-time ke client, pakai Server-Sent Events atau streaming response. Untuk iterasi pertama, cukup return `stepLogs[]` di akhir - client bisa polling atau tampilkan ringkasan.
- **Retry policy**: tidak ada retry otomatis. Kalau 1 step gagal dan parser fallback juga return objek minimal, pipeline lanjut ke step berikutnya dengan warning. Caller (UI) bisa lihat `stepLogs[i].status === "fallback"` dan memutuskan untuk retry manual.
- **Abort signal**: dihormati oleh `callProvider` (passing ke `fetch`). Kalau client cancel request (browser close), pipeline berhenti di step berikutnya yang await.
- **Logging**: `console.log` di tiap step dengan format `[aio-generate] step=3 blocks index=5/10 model=gpt-5.4 duration=4.2s status=success`. Untuk production, ganti ke proper logger (pino/winston) - TODO.

## Alur Data End-to-End (1x Request)

```
Client (form keyword + model)
  |
  v
POST /api/aio-generate
  |
  v
requireAuth() -> 401 kalau tidak login
  |
  v
Validasi body + modelId whitelist
  |
  v
Cek kredit + deduct_credits RPC -> 402 kalau kurang
  |
  v
runAioPipeline():
  |
  +- Step 1: buildResearchPrompt -> callProvider -> briefParser.parse
  |    -> AioBriefOutput (atau fallback)
  |
  +- Step 2: buildOutlinePrompt -> callProvider -> outlineParser.parse
  |    -> AioOutlineOutput (10 blok, atau fallback)
  |
  +- Step 3: buildBlockPrompt (LOOP 10x dengan rolling context)
  |    -> 10x AioBlockOutput
  |    -> gabung jadi fullMarkdown
  |
  +- Step 4: buildCritiquePrompt -> callProvider -> critiqueParser.parse
  |    -> AioCritiqueOutput (atau null jika skip/gagal)
  |
  +- Step 5: buildRefinementPrompt (HANYA jika critique.rewrite_targets.length > 0)
  |    -> AioRefinementOutput (atau null jika skip/no-target)
  |    -> finalMarkdown = refinement.refined_markdown (atau fullMarkdown)
  |
  +- Step 6: buildSchemaPrompt -> callProvider -> schemaParser.parse
  |    -> AioSchemaOutput (4 JSON-LD + validation)
  |
  +- Step 7: buildMetaPrompt -> callProvider -> metaParser.parse
  |    -> AioMetaOutput (title, meta, slug, OG, Twitter, canonical)
  |
  v
Konversi finalMarkdown -> fullHtml via marked
  |
  v
Response JSON { fullHtml, schemas, meta, qaScore, stepLogs, ... }
  |
  v
Client render di Tiptap Editor + sidebar preview schema/meta
  |
  v
[Optional] User klik Publish -> publishToWordPress(meta, fullHtml)
```

## 3 Invariant yang Dijaga

1. **Billing idempotent** - 1x deduct di awal, tidak per-step. Kalau中途 gagal, kredit hangus (konsisten dengan route existing).
2. **Fallback tidak pernah crash pipeline** - tiap step yang gagal parse akan trigger fallback parser, return objek minimal yang lolos type-check. Pipeline lanjut ke step berikutnya.
3. **Step log lengkap untuk debugging** - `stepLogs[7]` selalu berisi 7 entry (atau 5 jika skipCritique+skipRefinement, atau 6 jika salah satu skip). Client bisa lihat step mana yang fallback atau error.
