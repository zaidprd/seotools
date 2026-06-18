# Kontrak TypeScript: lib/prompt-aio.ts

Dokumen ini adalah rancangan antarmuka (interface) dan kerangka fungsi untuk `lib/prompt-aio.ts`. Tujuannya: membungkus 7 prompt pipeline (Prompt 1-5 sudah rancang di `docs/aio-prompts-draft.md`, Prompt 6 dan 7 di sini) menjadi fungsi TypeScript yang:

1. **Model-agnostic**: terima parameter `model: ModelInfo` + `providerBehavior` agar prompt bisa menyesuaikan gaya output tiap provider (Gemini/GPT/Claude/DeepSeek) tanpa menulis ulang seluruh teks.
2. **Output type-safe**: interface data output konsisten, sehingga Tiptap Editor di `components/ResultPanel.tsx` bisa merender apa pun model yang dipakai user.
3. **Server-only**: tidak dependensi browser API, dipanggil dari Route Handler `/api/aio-generate`.

## 1. Tipe Provider & Capability

```ts
// Liburan dari ModInfo provider string yang sudah ada di lib/constants.ts
// Tipe baru ini adalah union literal agar branch di prompt builder bisa exhaustive.

export type AioProviderId =
  | "google"      // Gemini
  | "openai"      // GPT-5.4
  | "anthropic"   // Claude Haiku/Sonnet
  | "deepseek"    // DeepSeek (kalau nanti ditambah)
  | "sumopod"     // proxy OpenAI-compatible
  | "openrouter"; // fallback

// Provider id di-resolve dari ModelInfo.provider + getProvider() di route.ts existing.
export function resolveProviderId(model: ModelInfo): AioProviderId { ... }

// Capability yang dibutuhkan pipeline. Tidak semua model punya semuanya.
export interface ProviderCapabilities {
  // Apakah provider bisa dipaksa output JSON via system/response_format
  // Gemini: ya (response_mime_type). OpenAI: ya (response_format json_object).
  // Claude & DeepSeek: TIDAK - perlu prompt trick + parser toleran.
  nativeJsonMode: boolean;

  // Apakah model suka instruksi verbose panjang (Claude) atau ringkas (Gemini Flash).
  // Dipakai untuk menyesuaikan panjang system prompt.
  promptVerbosity: "ringkas" | "sedang" | "verbose";

  // Apakah model cenderung wrap output di ```json ... ``` atau fences lain.
  // Claude & DeepSeek sering wrap. Parser harus strip fences.
  tendsToWrapInFences: boolean;

  // Apakah model secara default menambahkan intro/outro di luar JSON.
  // Claude & GPT-4 style sering iya. Flash & DeepSeek jarang.
  tendsToAddChatter: boolean;

  // Apakah token limit input/output model cukup untuk Prompt 4 (self-critique)
  // yang menilai artikel 1.200-2.000 kata. Model < 8k output TIDUK cukup.
  sufficientOutputForCritique: boolean;
}

// Registry statis per provider. Dipakai prompt builder untuk menambah
// instruksi format ketat khusus model yang bukan JSON native.
export const PROVIDER_CAPS: Record<AioProviderId, ProviderCapabilities> = {
  google:     { nativeJsonMode: true,  promptVerbosity: "ringkas",  tendsToWrapInFences: false, tendsToAddChatter: false, sufficientOutputForCritique: true  },
  openai:     { nativeJsonMode: true,  promptVerbosity: "sedang",   tendsToWrapInFences: false, tendsToAddChatter: true,  sufficientOutputForCritique: true  },
  anthropic:  { nativeJsonMode: false, promptVerbosity: "verbose",  tendsToWrapInFences: true,  tendsToAddChatter: true,  sufficientOutputForCritique: true  },
  deepseek:   { nativeJsonMode: false, promptVerbosity: "sedang",   tendsToWrapInFences: true,  tendsToAddChatter: false, sufficientOutputForCritique: true  },
  sumopod:    { nativeJsonMode: true,  promptVerbosity: "sedang",   tendsToWrapInFences: false, tendsToAddChatter: false, sufficientOutputForCritique: true  },
  openrouter: { nativeJsonMode: true,  promptVerbosity: "sedang",   tendsToWrapInFences: false, tendsToAddChatter: false, sufficientOutputForCritique: true  },
};
```

## 2. Tipe Input (Bersama)

```ts
// Di-inject dari form/dashboard. Semua field wajib kecuali yang ditandai opsional.
export interface AioInput {
  // ---- Wajib ----
  keyword: string;
  primaryKeyword: string;       // alias dari keyword, biar tidak ambigu
  language: string;             // "Indonesia" | "English (US)" | ...
  tone: string;                 // dari TONES di constants
  pov: string;                  // dari POVS
  readability: string;          // dari READABILITY
  articleType: string;          // dari ARTICLE_TYPES
  wordTarget: number;           // 1200-2000
  brandName: string;
  targetAudience: string;
  geo: string;                  // "Indonesia" default
  publishDate: string;          // ISO "2026-06-18"

  // ---- Opsional / dengan default ----
  secondaryKeywords?: string[];
  brandVoice?: string;
  brandRestrictions?: string;   // hal yang harus dihindari brand
  mustMention?: string;         // konsep/kata yang WAJIB muncul
  bannedSources?: string[];     // domain sumber yang dilarang
  recencyMarker?: string;       // default "2026"
  userTitle?: string;           // judul pilihan user, kosong = generator
  userOutlineOverride?: string; // override outline editor
  internalLinkBaseUrl?: string; // base URL untuk internal link
  allowedExternalDomains?: string[]; // whitelist domain eksternal
  authorName?: string;
  authorBio?: string;
  lastUpdated?: string;         // ISO date
}
```

## 3. Tipe Output Standar (Konsisten Lintas Model)

```ts
// ----- Prompt 1 -----
export interface AioBriefOutput {
  primary_keyword: string;
  search_intent: "informational" | "commercial" | "transactional";
  user_journey_stage: "awareness" | "consideration" | "decision";
  main_entity: {
    name: string;
    type: "concept" | "product" | "service" | "person" | "place" | "technology";
    synonyms_id: string[];
    synonyms_en: string[];
    related_entities: string[];
  };
  serp_signals: {
    top_3_patterns: string[];
    common_questions: string[];
    snippet_type_dominant: "definition" | "list" | "table" | "steps";
    content_gap: string;
  };
  unique_value_angle: string;
  must_include_facts: string[];     // tiap item berisi "... sumber: ..."
  must_avoid: string[];
  internal_link_opportunities: string[];
  external_source_targets: string[];
  recency_window: string;
}

// ----- Prompt 2 -----
export interface AioOutlineBlock {
  block: number;                    // 1-10
  name: AioBlockName;
  h2: string | null;
  target_words: number;
  purpose: string;
  direct_answer: string;            // 40-60 kata
  must_include: string[];
  format: AioBlockFormat[];
}
export type AioBlockName =
  | "Hook + TL;DR"
  | "Definisi"
  | "Why it matters"
  | "Core Framework"
  | "Perbandingan + Tabel"
  | "Step-by-step Guide"
  | "FAQ"
  | "Common Mistakes"
  | "Conclusion + CTA"
  | "Sources";
export type AioBlockFormat = "bullet" | "numbered" | "table" | "paragraph" | "quote";

export interface AioOutlineOutput {
  title: string;                    // <= 60 char
  slug: string;                     // 3-5 kata, lowercase + hubung
  meta_description: string;         // 130-155 char
  outline: AioOutlineBlock[];       // panjang 10
  faq_questions: string[];          // 5-7
  entity_coverage_checklist: string[];
  internal_link_plan: { anchor_hint: string; target_topic: string }[];
  external_link_plan: { anchor_hint: string; source_type: string }[];
  recency_marker_target: string;
}

// ----- Prompt 3 (per blok) -----
export interface AioBlockStats {
  word_count: number;
  has_direct_answer: boolean;
  has_table: boolean;
  has_ordered_list: boolean;
  internal_links_used: string[];
  external_links_used: string[];
  entities_mentioned: string[];
  recency_marker_present: boolean;
}
export interface AioBlockOutput {
  block_index: number;              // 1-10
  h2: string | null;
  content_markdown: string;
  stats: AioBlockStats;
}

// ----- Prompt 4 (self-critique) -----
export type AioCriterionStatus = "lulus" | "gagal" | "tidak_bisa_dinilai";
export interface AioCriterion {
  id: number;                       // 1-13
  name: string;
  score: 0 | 100;
  status: AioCriterionStatus;
  evidence: string;
  issue: string;
  fix_instruction: string | null;
}
export type AioRewritePriority = "tinggi" | "sedang" | "rendah";
export interface AioRewriteTarget {
  block_index: number;
  h2: string | null;
  reason: string;
  priority: AioRewritePriority;
}
export interface AioCritiqueOutput {
  overall_score: number;            // 0-100
  verdict: "lulus" | "perlu_revisi" | "gagal";
  summary: string;
  criteria: AioCriterion[];         // panjang 13
  global_issues: string[];
  rewrite_targets: AioRewriteTarget[];
}

// ----- Prompt 5 (refinement) -----
export interface AioRefinedBlock {
  block_index: number;
  h2: string | null;
  criteria_fixed: number[];         // id 1-13
  content_markdown: string;
  stats: AioBlockStats;
  diff_summary: string;
}
export interface AioRefinementOutput {
  revised_blocks: AioRefinedBlock[];
  unchanged_blocks: number[];       // daftar block_index
  global_fixes_applied: string[];
  post_revision_notes: string[];
  expected_new_score: number;       // 0-100
}

// ----- Prompt 6 (JSON-LD) -----
export type AioSchemaType = "Article" | "FAQPage" | "HowTo" | "BreadcrumbList";
export interface AioSchemaOutput {
  article: Record<string, unknown> | null;        // JSON-LD Article
  faq: Record<string, unknown> | null;            // JSON-LD FAQPage
  howto: Record<string, unknown> | null;          // JSON-LD HowTo (null jika bukan how-to)
  breadcrumb: Record<string, unknown> | null;     // JSON-LD BreadcrumbList
  validation: {
    article_valid: boolean;
    faq_valid: boolean;
    howto_valid: boolean | null;
    breadcrumb_valid: boolean;
  };
}

// ----- Prompt 7 (meta) -----
export interface AioMetaOutput {
  title: string;                    // <= 60 char
  slug: string;                     // 3-5 kata
  meta_description: string;         // 130-155 char
  og_title: string;                 // <= 95 char
  og_description: string;           // <= 200 char
  twitter_title: string;            // <= 70 char
  twitter_description: string;      // <= 200 char
  canonical_url: string | null;
  focus_keyword: string;
  validation: {
    title_length_ok: boolean;
    meta_length_ok: boolean;
    slug_format_ok: boolean;
    keyword_in_title: boolean;
    keyword_in_meta: boolean;
  };
}
```

## 4. Tipe Argumen Fungsi Builder (Prompt Builder)

```ts
// Argumen generic untuk semua builder. Dipakai agar satu signature
// bisa handle semua prompt tanpa tulis ulang tanda tangan 5x.

export interface AioBuildArgs {
  input: AioInput;
  model: ModelInfo;                 // dari MODELS di constants
  providerId: AioProviderId;        // hasil resolveProviderId(model)
  caps: ProviderCapabilities;       // hasil PROVIDER_CAPS[providerId]

  // Snapshot hasil prompt sebelumnya yang dipakai prompt berikutnya.
  // Null kalau prompt ini adalah prompt pertama.
  brief?: AioBriefOutput | null;
  outline?: AioOutlineOutput | null;

  // Untuk Prompt 3 per-bloc dan Prompt 5 targeted rewrite.
  blockIndex?: number;              // 1-10
  blockSpec?: AioOutlineBlock | null;
  fullOutlineJson?: AioOutlineOutput | null;
  prevBlocksText?: string;          // maks 600 kata
  nextBlockTitles?: string[];
  fullArticleMarkdown?: string;     // untuk Prompt 4 dan 5
  critique?: AioCritiqueOutput | null;
  rewriteTargets?: AioRewriteTarget[];

  // Untuk Prompt 6 dan 7.
  schemas?: AioSchemaOutput | null;
}

// Output generic: object berisi system + user prompt + parameter request.
// Caller (Route Handler) yang menerjemahkan ke body API per provider.
export interface AioPrompt {
  system: string;
  user: string;
  // Parameter khusus provider. Caller baca ini saat panggil API.
  // Gemini: pakai response_mime_type = "application/json".
  // OpenAI: pakai response_format = { type: "json_object" }.
  // Claude/DeepSeek: nativeJsonMode = false, parser akan toleran.
  requestParams: {
    maxTokens: number;
    temperature: number;
    responseMimeType?: "application/json"; // Gemini
    responseFormat?: { type: "json_object" }; // OpenAI
    // Claude & DeepSeek: tidak ada flag, parser di server yang handle.
  };
  // Tipe output yang diharapkan. Caller validasi runtime.
  expectedOutput: AioExpectedOutput;
}

// Discriminator untuk memberitahu caller & parser tipe output yang diharapkan.
export type AioExpectedOutput =
  | { kind: "json"; schema: "AioBriefOutput" }
  | { kind: "json"; schema: "AioOutlineOutput" }
  | { kind: "json"; schema: "AioBlockOutput" }
  | { kind: "json"; schema: "AioCritiqueOutput" }
  | { kind: "json"; schema: "AioRefinementOutput" }
  | { kind: "json"; schema: "AioSchemaOutput" }
  | { kind: "json"; schema: "AioMetaOutput" }
  | { kind: "markdown"; note: "fallback kalau model gagal JSON" };
```

## 5. Kerangka Fungsi (5 Fungsi Pipeline + 2 Tambahan)

```ts
// ===== Prompt 1: Riset Keyword + Brief =====
export function buildResearchPrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioBriefOutput
// maxTokens: 2500
// temperature: 0.4
// provider adjustment:
//   - google/openai/sumopod/openrouter: pakai responseMimeType/responseFormat
//   - anthropic/deepseek: tambah instruksi di system:
//     "Respond with ONLY the JSON object. No markdown fence. No commentary."

// ===== Prompt 2: Outline Generator (SOP-AIO 10 Blok) =====
export function buildOutlinePrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioOutlineOutput
// maxTokens: 3500
// temperature: 0.3
// dependensi: args.brief wajib diisi
// provider adjustment:
//   - anthropic: tambah di user "Output JSON schema persis. Jangan tambah field."

// ===== Prompt 3: Blok Penulisan (per blok, dipanggil 10x) =====
export function buildBlockPrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioBlockOutput
// maxTokens: 2000
// temperature: 0.7
// dependensi: args.brief, args.outline, args.blockIndex (1-10), args.blockSpec
// provider adjustment:
//   - semua provider: output JSON { content_markdown, stats }
//   - anthropic/deepseek: tambah instruksi parser-fallback di system

// ===== Prompt 4: Self-Critique (Quality Gate 13 Poin) =====
export function buildCritiquePrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioCritiqueOutput
// maxTokens: 3000
// temperature: 0.2  (rendah supaya penilaian konsisten)
// dependensi: args.fullArticleMarkdown
// guardrail: kalau caps.sufficientOutputForCritique === false, Route Handler
//            pecah artikel jadi 2 chunk dan jalankan 2x, lalu gabung.

// ===== Prompt 5: Refinement (Targeted Rewrite) =====
export function buildRefinementPrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioRefinementOutput
// maxTokens: 4000
// temperature: 0.5
// dependensi: args.fullArticleMarkdown, args.critique, args.rewriteTargets
// guardrail: kalau revised_blocks.length === 0, return refinement=no-op,
//            langsung simpan artikel v1 ke DB dan lanjut ke Prompt 6/7.

// ===== Prompt 6: JSON-LD Generator (4 schema) =====
export function buildSchemaPrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioSchemaOutput
// maxTokens: 3000
// temperature: 0.1  (sangat rendah supaya schema stabil)
// dependensi: args.fullArticleMarkdown, args.outline, args.brief
// provider adjustment:
//   - anthropic/deepseek: tambah "Setiap schema HARUS valid schema.org.
//     Jangan tambah komentar. Jangan wrap di ```."

// ===== Prompt 7: Meta Generator (title, slug, meta, OG, Twitter) =====
export function buildMetaPrompt(args: AioBuildArgs): AioPrompt;
// expectedOutput: AioMetaOutput
// maxTokens: 800
// temperature: 0.3
// dependensi: args.fullArticleMarkdown, args.outline, args.brief
// guardrail: kalau validation.keyword_in_title === false, Route Handler
//            retry sekali dengan prompt yang lebih ketat.
```

## 6. Parser & Validator (Di Sisi Caller, Bukan Builder)

Builder hanya menghasilkan teks prompt. Parser JSON, normalisasi output model, dan fallback markdown dipisah di file `lib/aio-parser.ts` (nanti) agar builder tetap murni dan mudah dites.

```ts
// Interface parser - bukan isi implementasi di kontrak ini.
export interface AioParser<T> {
  // Strip markdown fence, preamble, dan trailing commentary.
  // Tolerant terhadap output Claude/DeepSeek yang sering wrap.
  parse(rawText: string, providerId: AioProviderId): T;

  // Kalau parse() gagal, fallback: ekstrak block dari markdown polos
  // dan susun objek minimal yang lolos type-check.
  parseMarkdownFallback(rawText: string): T;
}

// 7 parser instance, satu per expectedOutput.
export const briefParser: AioParser<AioBriefOutput>;
export const outlineParser: AioParser<AioOutlineOutput>;
export const blockParser: AioParser<AioBlockOutput>;
export const critiqueParser: AioParser<AioCritiqueOutput>;
export const refinementParser: AioParser<AioRefinementOutput>;
export const schemaParser: AioParser<AioSchemaOutput>;
export const metaParser: AioParser<AioMetaOutput>;
```

## 7. Strategi Branch per Provider (Ditulis Sekali, Dipakai Semua Builder)

```ts
// Helper internal - bukan export. Dipakai di setiap builder.
function withProviderAdapters(prompt: AioPrompt, caps: ProviderCapabilities): AioPrompt {
  let { system, user } = prompt;
  if (!caps.nativeJsonMode) {
    // Claude/DeepSeek: tidak mendukung response_format. Tambah tekanan.
    system = system + "\n\nCRITICAL OUTPUT FORMAT:\n- Respond with ONLY valid JSON.\n- No markdown code fence (no ```).\n- No commentary before or after the JSON.\n- No trailing prose.";
    user = user + "\n\nReminder: output JSON only, no prose.";
  }
  if (caps.tendsToWrapInFences) {
    system = system + "\n- The first character of your response MUST be '{' and the last MUST be '}'.";
  }
  if (caps.tendsToAddChatter) {
    system = system + "\n- Do not include 'Tentu', 'Baik', 'Berikut adalah', 'Here is', 'Sure' at the start.";
  }
  if (caps.promptVerbosity === "verbose") {
    // Claude: butuh instruksi lebih eksplisit.
    system = system + "\n\nThink step by step about the constraints above before responding. Then output JSON.";
  }
  return { ...prompt, system, user };
}
```

## 8. Kontrak dengan Tiptap Editor (ResultPanel.tsx)

Output akhir yang sampai ke Tiptap adalah union type:

```ts
// Union ini yang akan dibaca ResultPanel.tsx versi AIO.
export type AioFinalArticle = {
  version: "aio-v1";
  brief: AioBriefOutput;
  outline: AioOutlineOutput;
  blocks: AioBlockOutput[];           // panjang 10, urut 1-10
  fullMarkdown: string;                // gabungan content_markdown 10 blok
  fullHtml: string;                    // hasil marked(fullMarkdown)
  critique: AioCritiqueOutput | null;  // null kalau skip Prompt 4
  refinement: AioRefinementOutput | null;
  schemas: AioSchemaOutput;
  meta: AioMetaOutput;
  qaScore: number;                     // 0-100
  wordCount: number;
  readingTimeMin: number;              // wordCount / 200, ceil
  model: ModelInfo;                    // snapshot model yang dipakai
  providerId: AioProviderId;
  generatedAt: string;                 // ISO timestamp
};
```

Tiptap cukup baca `fullHtml` untuk dirender ke editor dan `meta` + `schemas` untuk preview di sidebar. Field lain untuk audit dan analytics.

## 9. Catatan Implementasi (Untuk Round Berikutnya)

1. **Tipe `Config` di `lib/constants.ts` tidak dipakai di kontrak ini.** Kontrak AIO sengaja independen agar tidak terikat refactor `Config`. Saat integrasi, Route Handler yang menerjemahkan `Config` -> `AioInput`.
2. **Provider baru** (misal DeepSeek) tinggal tambah entry di `AioProviderId` + `PROVIDER_CAPS`. Builder tidak perlu diubah.
3. **Output interface stable** artinya Tiptap editor tidak akan pecah walau model diganti. Parser yang akan menderita, bukan UI.
4. **Fallback markdown** untuk `blockParser` dipakai saat model gagal JSON. Hasil fallback punya `stats` seminimal mungkin (word_count, has_table, has_ordered_list), tanpa entity/link tracking.
5. **Single source of truth**: `lib/prompt-aio.ts` untuk builder, `lib/aio-parser.ts` untuk parser. Route Handler `/api/aio-generate` yang mengorkestrasi loop pipeline.
