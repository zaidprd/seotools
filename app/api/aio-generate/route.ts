// app/api/aio-generate/route.ts
// Route Handler untuk pipeline AI Overview (7 prompt sequential + loop 10x).
// Orchestrator: Prompt 1 (research) -> 2 (outline) -> 3 (blocks 10x) -> 4 (critique)
// -> 5 (refinement) -> 6 (schema) -> 7 (meta) -> response JSON siap tempel ke Tiptap.
//
// Pola sama dengan app/api/generate/route.ts untuk auth, billing, dan provider call.
// Bedanya: sequential pipeline + parser per-step + step logging.

import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";
import { createClient } from "@supabase/supabase-js";
import { CREDIT_COST, FREE_ARTICLE_COST, MODELS, ModelInfo } from "@/lib/constants";
import { requireAuth } from "@/lib/supabase/require-auth";
import {
  AioProviderId,
  AioInput,
  AioPrompt,
  AioBriefOutput,
  AioOutlineOutput,
  AioBlockOutput,
  AioCritiqueOutput,
  AioRefinementOutput,
  AioSchemaOutput,
  AioMetaOutput,
  AioRewriteTarget,
  ProviderCapabilities,
  PROVIDER_CAPS,
  resolveProviderId,
  buildResearchPrompt,
  buildOutlinePrompt,
  buildBlockPrompt,
  buildCritiquePrompt,
  buildRefinementPrompt,
  buildSchemaPrompt,
  buildMetaPrompt,
} from "@/lib/prompt-aio";
import {
  AioParser,
  briefParser,
  outlineParser,
  blockParser,
  critiqueParser,
  refinementParser,
  schemaParser,
  metaParser,
  ParseAttempt,
} from "@/lib/aio-parser";

export const runtime = "nodejs";
export const maxDuration = 180; // 3 menit, sesuai step budget

// ============================================================================
// 1. Tipe Internal
// ============================================================================

type StepStatus = "success" | "fallback" | "error" | "skipped";

export interface StepLog {
  step: number;
  name: string;
  status: StepStatus;
  durationMs: number;
  model: string;
  providerId: AioProviderId;
  bytesIn: number;
  bytesOut: number;
  attemptSuccess: boolean;
  usedFallback: boolean;
  error: string | null;
  notes: string[];
}

export interface AioGenerateRequest {
  keyword: string;
  primaryKeyword: string;
  modelId: string;
  brandName: string;
  targetAudience: string;
  language?: string;
  tone?: string;
  pov?: string;
  readability?: string;
  articleType?: string;
  wordTarget?: number;
  geo?: string;
  publishDate?: string;
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
  skipCritique?: boolean;
  skipRefinement?: boolean;
}

export interface AioGenerateResponse {
  success: boolean;
  fullMarkdown: string;
  fullHtml: string;
  schemas: AioSchemaOutput;
  meta: AioMetaOutput;
  qaScore: number;
  creditsUsed: number;
  stepLogs: StepLog[];
  brief: AioBriefOutput;
  outline: AioOutlineOutput;
  blocks: AioBlockOutput[];
  critique: AioCritiqueOutput | null;
  refinement: AioRefinementOutput | null;
  warnings: string[];
  error: string | null;
}

interface PipelineContext {
  input: AioInput;
  model: ModelInfo;
  providerId: AioProviderId;
  caps: ProviderCapabilities;
  userId: string;
  signal: AbortSignal;
  stepLogs: StepLog[];
  warnings: string[];
  skipCritique: boolean;
  skipRefinement: boolean;
}

// ============================================================================
// 2. Helper: build AioInput dari Request
// ============================================================================

function buildAioInput(req: AioGenerateRequest): AioInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    keyword: req.keyword,
    primaryKeyword: req.primaryKeyword,
    language: req.language || "Indonesia",
    tone: req.tone || "Profesional",
    pov: req.pov || "Umum (Anda/Kita)",
    readability: req.readability || "Menengah (SMA)",
    articleType: req.articleType || "Blog Post",
    wordTarget: req.wordTarget || 1600,
    brandName: req.brandName,
    targetAudience: req.targetAudience,
    geo: req.geo || "Indonesia",
    publishDate: req.publishDate || today,
    secondaryKeywords: req.secondaryKeywords,
    brandVoice: req.brandVoice,
    brandRestrictions: req.brandRestrictions,
    mustMention: req.mustMention,
    bannedSources: req.bannedSources,
    recencyMarker: req.recencyMarker,
    userTitle: req.userTitle,
    userOutlineOverride: req.userOutlineOverride,
    internalLinkBaseUrl: req.internalLinkBaseUrl,
    allowedExternalDomains: req.allowedExternalDomains,
    authorName: req.authorName,
    authorBio: req.authorBio,
    lastUpdated: req.lastUpdated,
  };
}

// ============================================================================
// 3. Helper: callProvider + runStep
// ============================================================================

/** Panggil API provider sesuai AioPrompt + providerId. Return raw string. */
async function callProvider(
  prompt: AioPrompt,
  providerId: AioProviderId,
  signal: AbortSignal,
): Promise<string> {
  const oaiBase = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";
  const oaiKey = process.env.SUMOPOD_API_KEY;

  // OAI-compatible (SumoPod/Gemini/OpenAI/OpenRouter) dengan response_format.
  if (providerId === "sumopod" || providerId === "google" || providerId === "openai" || providerId === "openrouter") {
    if (!oaiKey) throw new Error("Konfigurasi server tidak lengkap (SUMOPOD_API_KEY)");
    const modelId = prompt.system.length > 0 ? "configured-by-builder" : "configured-by-builder";
    // Body generic; model id spesifik ditangani oleh caller via model param.
    const body: Record<string, unknown> = {
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: prompt.requestParams.maxTokens,
      temperature: prompt.requestParams.temperature,
    };
    if (prompt.requestParams.responseFormat) body.response_format = prompt.requestParams.responseFormat;
    // Untuk Gemini via OpenAI-compat, response_mime_type mungkin tidak di-forward;
    // parser kita sudah tangani semua kasus via stack-scan.
    if (prompt.requestParams.responseMimeType) body.response_mime_type = prompt.requestParams.responseMimeType;

    // Model id spesifik dari ModelInfo (di-pass via context, lihat pemanggilan).
    // Karena callProvider ini generic, caller harus wrap untuk inject model id.
    throw new Error("callProvider: gunakan callProviderForModel dengan model.id eksplisit");
  }

  // Semua provider lewat SumoPod (OpenAI-compatible) - lihat callProviderForModel.
  throw new Error(`callProvider generic tidak dipakai - gunakan callProviderForModel untuk ${providerId}`);
}

/** Panggil API provider dengan model id eksplisit. Return raw string. */
async function callProviderForModel(
  prompt: AioPrompt,
  model: ModelInfo,
  signal: AbortSignal,
): Promise<string> {
  const providerId = resolveProviderId(model);
  const oaiBase = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";
  const oaiKey = process.env.SUMOPOD_API_KEY;

  // Semua provider lewat SumoPod (proxy OpenAI-compatible, 1 key untuk semua).
  if (!oaiKey) throw new Error("Konfigurasi server tidak lengkap (SUMOPOD_API_KEY)");

  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    max_tokens: prompt.requestParams.maxTokens,
    temperature: prompt.requestParams.temperature,
  };
  if (prompt.requestParams.responseFormat) body.response_format = prompt.requestParams.responseFormat;
  if (prompt.requestParams.responseMimeType) body.response_mime_type = prompt.requestParams.responseMimeType;

  const r = await fetch(`${oaiBase.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${oaiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "(no body)");
    throw new Error(`Provider error (${r.status}): ${errText.slice(0, 200)}`);
  }
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (typeof text !== "string") throw new Error("Provider response tidak berisi string content");
  return text;
}

/** Jalankan 1 step: build prompt, call API, parse, log. */
async function runStep<T>(
  ctx: PipelineContext,
  stepNumber: number,
  stepName: string,
  buildPromptFn: () => AioPrompt,
  parser: AioParser<T>,
): Promise<{ data: T; log: StepLog }> {
  const startedAt = Date.now();
  const log: StepLog = {
    step: stepNumber,
    name: stepName,
    status: "error",
    durationMs: 0,
    model: ctx.model.id,
    providerId: ctx.providerId,
    bytesIn: 0,
    bytesOut: 0,
    attemptSuccess: false,
    usedFallback: false,
    error: null,
    notes: [],
  };

  let rawText = "";
  let attempt: ParseAttempt<T>;
  try {
    const prompt = buildPromptFn();
    log.bytesIn = prompt.system.length + prompt.user.length;
    rawText = await callProviderForModel(prompt, ctx.model, ctx.signal);
    log.bytesOut = rawText.length;
    attempt = parser.parse(rawText, ctx.providerId);
  } catch (e: unknown) {
    log.durationMs = Date.now() - startedAt;
    log.error = e instanceof Error ? e.message : String(e);
    log.notes.push("callProvider atau builder throw");
    ctx.stepLogs.push(log);
    // Panggil fallback untuk dapat objek minimal.
    const fallbackData = parser.parseMarkdownFallback(rawText);
    log.usedFallback = true;
    log.status = "fallback";
    return { data: fallbackData, log };
  }

  log.durationMs = Date.now() - startedAt;
  log.attemptSuccess = attempt.success;
  log.error = attempt.error;

  if (attempt.success && attempt.data) {
    log.status = "success";
    ctx.stepLogs.push(log);
    return { data: attempt.data, log };
  }

  // Parse gagal -> panggil fallback.
  log.usedFallback = true;
  log.status = "fallback";
  log.notes.push(`parse() gagal: ${attempt.error || "unknown"}`);
  const fallbackData = parser.parseMarkdownFallback(rawText);
  ctx.stepLogs.push(log);
  return { data: fallbackData, log };
}

/** Log step yang di-skip (misal karena flag user atau prekondisi tidak terpenuhi). */
function makeSkippedLog(step: number, name: string, reason: string, ctx: PipelineContext): StepLog {
  const log: StepLog = {
    step,
    name,
    status: "skipped",
    durationMs: 0,
    model: ctx.model.id,
    providerId: ctx.providerId,
    bytesIn: 0,
    bytesOut: 0,
    attemptSuccess: false,
    usedFallback: false,
    error: null,
    notes: [reason],
  };
  ctx.stepLogs.push(log);
  return log;
}

// ============================================================================
// 4. 7 Step Function + Loop 10x untuk Step 3
// ============================================================================

async function step1Research(ctx: PipelineContext): Promise<AioBriefOutput> {
  const { data } = await runStep(ctx, 1, "research", () =>
    buildResearchPrompt({ input: ctx.input, model: ctx.model, providerId: ctx.providerId, caps: ctx.caps }),
    briefParser,
  );
  return data;
}

async function step2Outline(ctx: PipelineContext, brief: AioBriefOutput): Promise<AioOutlineOutput> {
  const { data } = await runStep(ctx, 2, "outline", () =>
    buildOutlinePrompt({ input: ctx.input, model: ctx.model, providerId: ctx.providerId, caps: ctx.caps, brief }),
    outlineParser,
  );
  return data;
}

/**
 * Loop 10x untuk Prompt 3. Pakai teknik rolling context:
 * - prevBlocksText: gabung 10 blok sebelumnya, slice 3000 char terakhir.
 * - nextBlockTitles: judul 2 blok setelahnya saja (tanpa isi).
 * - accumulated: fullMarkdown yang sedang tumbuh (untuk Step 4 critique).
 */
async function step3Blocks(ctx: PipelineContext, outline: AioOutlineOutput): Promise<AioBlockOutput[]> {
  const blocks: AioBlockOutput[] = [];
  const prevBuffer: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const blockSpec = outline.outline[i - 1];
    if (!blockSpec) {
      ctx.warnings.push(`Step 3 loop ${i}/10: outline.outline[${i - 1}] undefined, pakai fallback minimal`);
      const fb = blockParser.parseMarkdownFallback("");
      fb.block_index = i;
      blocks.push(fb);
      continue;
    }
    const nextBlockTitles = outline.outline
      .slice(i, i + 2)
      .map((b) => b.h2 || b.name);
    const prevBlocksText = prevBuffer.join("\n\n").slice(-3000);

    const { data } = await runStep(ctx, 3, `blocks-${i}/10`, () =>
      buildBlockPrompt({
        input: ctx.input,
        model: ctx.model,
        providerId: ctx.providerId,
        caps: ctx.caps,
        outline,
        blockIndex: i,
        blockSpec,
        prevBlocksText,
        nextBlockTitles,
      }),
      blockParser,
    );
    blocks.push(data);
    const piece = (data.h2 ? `## ${data.h2}\n\n` : "") + data.content_markdown;
    prevBuffer.push(piece);
    // Jaga buffer tetap 3 blok terakhir untuk hemat memory.
    if (prevBuffer.length > 3) prevBuffer.shift();
  }

  return blocks;
}

async function step4Critique(
  ctx: PipelineContext,
  fullMarkdown: string,
  outline: AioOutlineOutput,
): Promise<AioCritiqueOutput | null> {
  if (ctx.skipCritique) {
    makeSkippedLog(4, "critique", "skipCritique flag", ctx);
    return null;
  }
  const { data } = await runStep(ctx, 4, "critique", () =>
    buildCritiquePrompt({
      input: ctx.input,
      model: ctx.model,
      providerId: ctx.providerId,
      caps: ctx.caps,
      outline,
      fullArticleMarkdown: fullMarkdown,
    }),
    critiqueParser,
  );
  // Catat warning jika parser fallback (semua criteria gagal) terpakai.
  if (data.qa_score === 0 && data.verdict === "gagal" && data.criteria.every((c) => c.status === "gagal")) {
    ctx.warnings.push("Step 4 critique: parser fallback terpakai (semua 13 poin gagal)");
  }
  return data;
}

async function step5Refinement(
  ctx: PipelineContext,
  fullMarkdown: string,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
  critique: AioCritiqueOutput | null,
): Promise<{ refinement: AioRefinementOutput | null; refinedMarkdown: string }> {
  // Prekondisi: critique harus ada dan ada rewrite_targets.
  if (ctx.skipRefinement) {
    makeSkippedLog(5, "refinement", "skipRefinement flag", ctx);
    return { refinement: null, refinedMarkdown: fullMarkdown };
  }
  if (!critique) {
    makeSkippedLog(5, "refinement", "no critique (skipCritique atau step 4 gagal)", ctx);
    return { refinement: null, refinedMarkdown: fullMarkdown };
  }
  if (critique.rewrite_targets.length === 0) {
    makeSkippedLog(5, "refinement", `semua 13 poin lulus (qa_score=${critique.qa_score})`, ctx);
    return { refinement: null, refinedMarkdown: fullMarkdown };
  }

  const rewriteTargets: AioRewriteTarget[] = critique.rewrite_targets;
  const { data } = await runStep(ctx, 5, "refinement", () =>
    buildRefinementPrompt({
      input: ctx.input,
      model: ctx.model,
      providerId: ctx.providerId,
      caps: ctx.caps,
      outline,
      brief,
      fullArticleMarkdown: fullMarkdown,
      critique,
      rewriteTargets,
    }),
    refinementParser,
  );

  if (data.is_refined && data.refined_markdown) {
    return { refinement: data, refinedMarkdown: data.refined_markdown };
  }
  ctx.warnings.push("Step 5 refinement: tidak ada blok yang direvisi, artikel v1 dipakai");
  return { refinement: data, refinedMarkdown: fullMarkdown };
}

async function step6Schema(
  ctx: PipelineContext,
  finalMarkdown: string,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
): Promise<AioSchemaOutput> {
  const { data } = await runStep(ctx, 6, "schema", () =>
    buildSchemaPrompt({
      input: ctx.input,
      model: ctx.model,
      providerId: ctx.providerId,
      caps: ctx.caps,
      outline,
      brief,
      fullArticleMarkdown: finalMarkdown,
    }),
    schemaParser,
  );
  return data;
}

async function step7Meta(
  ctx: PipelineContext,
  finalMarkdown: string,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
): Promise<AioMetaOutput> {
  const { data } = await runStep(ctx, 7, "meta", () =>
    buildMetaPrompt({
      input: ctx.input,
      model: ctx.model,
      providerId: ctx.providerId,
      caps: ctx.caps,
      outline,
      brief,
      fullArticleMarkdown: finalMarkdown,
    }),
    metaParser,
  );
  return data;
}

// ============================================================================
// 5. Orchestrator runAioPipeline
// ============================================================================

/** Susun fullMarkdown dari 10 blocks. Sort by block_index untuk safety. */
function joinBlocksToMarkdown(blocks: AioBlockOutput[]): string {
  return blocks
    .slice()
    .sort((a, b) => a.block_index - b.block_index)
    .map((b) => (b.h2 ? `## ${b.h2}\n\n` : "") + b.content_markdown)
    .join("\n\n");
}

function countWords(text: string): number {
  return text.replace(/[#*_>`\[\]()|]/g, " ").split(/\s+/).filter(Boolean).length;
}

async function runAioPipeline(
  req: AioGenerateRequest,
  userId: string,
  signal: AbortSignal,
): Promise<AioGenerateResponse> {
  const stepLogs: StepLog[] = [];
  const warnings: string[] = [];
  const input = buildAioInput(req);
  const model = MODELS.find((m) => m.id === req.modelId) || MODELS[0];
  const providerId = resolveProviderId(model);
  const caps = PROVIDER_CAPS[providerId];
  const ctx: PipelineContext = {
    input, model, providerId, caps, userId, signal, stepLogs, warnings,
    skipCritique: req.skipCritique ?? false,
    skipRefinement: req.skipRefinement ?? false,
  };

  // Step 1: Research
  const brief = await step1Research(ctx);

  // Step 2: Outline
  const outline = await step2Outline(ctx, brief);

  // Step 3: Blocks (loop 10x)
  const blocks = await step3Blocks(ctx, outline);
  const fullMarkdown = joinBlocksToMarkdown(blocks);
  const wordCount = countWords(fullMarkdown);

  // Step 4: Critique (optional)
  const critique = await step4Critique(ctx, fullMarkdown, outline);

  // Step 5: Refinement (conditional)
  const { refinement, refinedMarkdown } = await step5Refinement(ctx, fullMarkdown, outline, brief, critique);
  const finalMarkdown = refinedMarkdown;

  // Step 6: Schema
  const schemas = await step6Schema(ctx, finalMarkdown, outline, brief);

  // Step 7: Meta
  const meta = await step7Meta(ctx, finalMarkdown, outline, brief);

  // Markdown -> HTML
  const fullHtml = await marked.parse(finalMarkdown, { async: true });

  // qaScore: dari critique jika ada, jika tidak fallback dari wordCount.
  const qaScore = critique && critique.qa_score > 0
    ? critique.qa_score
    : Math.min(100, Math.round((wordCount / 1200) * 100));

  return {
    success: true,
    fullMarkdown: finalMarkdown,
    fullHtml,
    schemas,
    meta,
    qaScore,
    creditsUsed: model.credits,
    stepLogs,
    brief,
    outline,
    blocks,
    critique,
    refinement,
    warnings,
    error: null,
  };
}

// ============================================================================
// 6. POST() Handler - Auth, Billing, Pipeline
// ============================================================================

/** Helper: validate request body. Return error string atau null. */
function validateRequest(body: unknown): { req: AioGenerateRequest; error: null } | { req: null; error: string } {
  if (!body || typeof body !== "object") return { req: null, error: "Body bukan JSON valid" };
  const b = body as Record<string, unknown>;
  const required: (keyof AioGenerateRequest)[] = [
    "keyword", "primaryKeyword", "modelId", "brandName", "targetAudience",
  ];
  for (const k of required) {
    if (!b[k as string] || typeof b[k as string] !== "string") {
      return { req: null, error: `Field wajib tidak ada atau kosong: ${String(k)}` };
    }
  }
  if (typeof b.modelId === "string" && !MODELS.find((m) => m.id === b.modelId)) {
    return { req: null, error: `Model tidak dikenal: ${b.modelId}` };
  }
  return { req: body as AioGenerateRequest, error: null };
}

/** Helper: cek + deduct kredit. Return { ok: true, cost } atau { ok: false, error }. */
async function checkAndDeductCredits(
  supabase: any,
  userId: string,
  modelId: string,
): Promise<{ ok: true; cost: number; isFree: boolean; isAdmin: boolean } | { ok: false; error: string; status: number }> {
  const { data: userDataRaw, error: userErr } = await supabase
    .from("users")
    .select("credits, plan, plan_expires_at, role")
    .eq("id", userId)
    .single();
  const userData = userDataRaw as { credits: number; plan: string; plan_expires_at: string | null; role: string; credits_used?: number; articles_used?: number } | null;
  if (userErr || !userData) return { ok: false, error: "User tidak ditemukan", status: 404 };

  const isAdmin = userData.role === "admin";
  const planIsActive = isAdmin || !userData.plan_expires_at || new Date(userData.plan_expires_at) > new Date();
  const effectivePlan = isAdmin
    ? "pro"
    : userData.plan && userData.plan !== "free" && planIsActive
      ? userData.plan
      : "free";
  const isFree = effectivePlan === "free";
  const cost = isFree ? FREE_ARTICLE_COST : (CREDIT_COST[modelId] ?? 1);

  if (isAdmin) return { ok: true, cost, isFree, isAdmin };

  // Atomic deduct via RPC.
  const { data: deduct, error: rpcError } = await (supabase.rpc as any)("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
  });
  if (rpcError) {
    // Fallback ke update manual jika RPC belum di-install.
    if ((userData.credits ?? 0) < cost) {
      return {
        ok: false,
        error: `Kredit tidak cukup. Butuh ${cost}, punya ${userData.credits ?? 0}.`,
        status: 402,
      };
    }
    await (supabase
      .from("users")
      .update as any)({
        credits: userData.credits - cost,
        credits_used: 0,
        articles_used: 0,
      })
      .eq("id", userId);
    return { ok: true, cost, isFree, isAdmin: false };
  }
  const r = deduct as { success: boolean; credits: number } | null;
  if (!r?.success) {
    return {
      ok: false,
      error: `Kredit tidak cukup. Butuh ${cost}, punya ${r?.credits ?? 0}.`,
      status: 402,
    };
  }
  return { ok: true, cost, isFree, isAdmin: false };
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // 1. Auth
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const userId = user.id;

  // 2. Parse + validasi body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  const v = validateRequest(body);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
  const aioReq = v.req!;

  // 3. Setup supabase + billing
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const billing = await checkAndDeductCredits(supabase, userId, aioReq.modelId);
  if (!billing.ok) {
    return NextResponse.json({ error: billing.error }, { status: billing.status });
  }

  // 4. Setup AbortController + jalankan pipeline
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 175_000); // 5 detik buffer sebelum maxDuration
  req.signal.addEventListener("abort", () => controller.abort());

  let response: AioGenerateResponse;
  try {
    response = await runAioPipeline(aioReq, userId, controller.signal);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[aio-generate] user=${userId} model=${aioReq.modelId} unhandled error: ${msg}`);
    return NextResponse.json(
      { error: `Pipeline gagal: ${msg}`, stepLogs: [] },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }

  // 5. Log durasi total
  const totalMs = Date.now() - startedAt;
  const successCount = response.stepLogs.filter((l) => l.status === "success").length;
  const fallbackCount = response.stepLogs.filter((l) => l.status === "fallback").length;
  const skippedCount = response.stepLogs.filter((l) => l.status === "skipped").length;
  console.log(
    `[aio-generate] user=${userId} model=${aioReq.modelId} duration=${totalMs}ms ` +
    `qa=${response.qaScore} steps=${response.stepLogs.length} ` +
    `success=${successCount} fallback=${fallbackCount} skipped=${skippedCount} ` +
    `cost=${billing.cost}`,
  );

  return NextResponse.json(response);
}
