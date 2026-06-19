// lib/prompt-aio.ts
// Modul builder prompt untuk pipeline AI Overview (SOP-AIO).
// File ini berisi:
//   1. Tipe data dasar (AioInput, AioProviderId, ProviderCapabilities, dll).
//   2. Registry PROVIDER_CAPS.
//   3. Helper withProviderAdapters() untuk menyesuaikan prompt per model.
//   4. buildResearchPrompt() - prototipe fungsi Prompt 1 (riset keyword + brief).
//
// Pola ini jadi acuan untuk buildOutlinePrompt, buildBlockPrompt, dll di file
// yang sama atau file lanjutan. Parser JSON + fallback markdown dipisah di
// lib/aio-parser.ts (TODO).

import type { ModelInfo } from "./constants";

// ============================================================================
// 1. Tipe Provider & Capability
// ============================================================================

/**
 * ID provider hasil resolve dari ModelInfo.provider yang sudah ada di
 * lib/constants.ts. Union literal agar branch di prompt builder exhaustive
 * dan compiler bisa type-narrow.
 */
export type AioProviderId =
  | "google"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "sumopod"
  | "openrouter";

/**
 * Kemampuan provider yang memengaruhi cara penulisan prompt.
 * - nativeJsonMode: provider mendukung flag response_format/response_mime_type
 *   untuk memaksa output JSON. Jika false (Claude, DeepSeek), prompt perlu
 *   instruksi eksplisit agar output JSON valid tanpa fence.
 * - promptVerbosity: preferensi panjang system prompt. "verbose" untuk model
 *   yang butuh instruksi lebih eksplisit (Claude).
 * - tendsToWrapInFences: provider yang sering membungkus output di ```json.
 * - tendsToAddChatter: provider yang sering menambah preamble ("Tentu", "Baik").
 * - sufficientOutputForCritique: token output cukup untuk Prompt 4 yang menilai
 *   artikel 1.200-2.000 kata.
 */
export interface ProviderCapabilities {
  nativeJsonMode: boolean;
  promptVerbosity: "ringkas" | "sedang" | "verbose";
  tendsToWrapInFences: boolean;
  tendsToAddChatter: boolean;
  sufficientOutputForCritique: boolean;
}

/**
 * Registry statis per provider. Tambah provider baru = tambah entry di sini.
 * Builder tidak perlu diubah, hanya perlu pakai lookup.
 */
export const PROVIDER_CAPS: Record<AioProviderId, ProviderCapabilities> = {
  google: {
    nativeJsonMode: true,
    promptVerbosity: "ringkas",
    tendsToWrapInFences: false,
    tendsToAddChatter: false,
    sufficientOutputForCritique: true,
  },
  openai: {
    nativeJsonMode: true,
    promptVerbosity: "sedang",
    tendsToWrapInFences: false,
    tendsToAddChatter: true,
    sufficientOutputForCritique: true,
  },
  anthropic: {
    nativeJsonMode: false,
    promptVerbosity: "verbose",
    tendsToWrapInFences: true,
    tendsToAddChatter: true,
    sufficientOutputForCritique: true,
  },
  deepseek: {
    nativeJsonMode: false,
    promptVerbosity: "sedang",
    tendsToWrapInFences: true,
    tendsToAddChatter: false,
    sufficientOutputForCritique: true,
  },
  sumopod: {
    nativeJsonMode: true,
    promptVerbosity: "sedang",
    tendsToWrapInFences: false,
    tendsToAddChatter: false,
    sufficientOutputForCritique: true,
  },
  openrouter: {
    nativeJsonMode: true,
    promptVerbosity: "sedang",
    tendsToWrapInFences: false,
    tendsToAddChatter: false,
    sufficientOutputForCritique: true,
  },
};

/**
 * Resolve AioProviderId dari ModelInfo. Mapping ke provider string yang sudah
 * dipakai di app/api/generate/route.ts (getProvider).
 */
export function resolveProviderId(model: ModelInfo): AioProviderId {
  const p = (model.provider || "").toLowerCase();
  if (p === "google") return "google";
  if (p === "openai") return "openai";
  if (p === "anthropic") return "anthropic";
  if (p === "deepseek") return "deepseek";
  if (p === "sumopod") return "sumopod";
  return "openrouter";
}

// ============================================================================
// 2. Tipe Input (AioInput)
// ============================================================================

/**
 * Input standar untuk semua prompt builder. Di-inject dari form/dashboard
 * oleh Route Handler. Field opsional ditandai `?`.
 */
export interface AioInput {
  // Wajib
  keyword: string;
  primaryKeyword: string;
  language: string;
  tone: string;
  pov: string;
  readability: string;
  articleType: string;
  wordTarget: number;
  brandName: string;
  targetAudience: string;
  geo: string;
  publishDate: string;

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
  noExternalLinks?: boolean;   // true = larang semua link eksternal di artikel
  internalLinkPages?: string;  // daftar URL halaman manual (satu per baris) — AI HANYA boleh gunakan URL ini
  authorName?: string;
  authorBio?: string;
  lastUpdated?: string;
}

// ============================================================================
// 3. Tipe Output Standar (konsisten lintas model)
//    Definisi lengkap ada di docs/aio-ts-contract.md. Di sini hanya yang
//    dipakai buildResearchPrompt agar file self-contained.
// ============================================================================

/** Output Prompt 1 - hasil research brief. */
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
  must_include_facts: string[];
  must_avoid: string[];
  internal_link_opportunities: string[];
  external_source_targets: string[];
  recency_window: string;
}

/** Output Prompt 2 - outline 10 blok SOP-AIO. */
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

/** 1 elemen di dalam array AioOutlineOutput.outline. */
export interface AioOutlineBlock {
  block: number;                // 1-10, urut sesuai SOP-AIO
  name: AioBlockName;
  h2: string | null;            // null jika blok tidak pakai H2
  target_words: number;
  purpose: string;              // 1 kalimat tujuan blok
  direct_answer: string;        // 40-60 kata, paragraf pertama blok
  must_include: string[];
  format: AioBlockFormat[];
}

/** Output Prompt 2 - dipakai sebagai input Prompt 3 (loop 10x per blok). */
export interface AioOutlineOutput {
  title: string;                // <= 60 char, mengandung keyword
  slug: string;                 // 3-5 kata, lowercase + hubung
  meta_description: string;     // 130-155 char, mengandung keyword
  outline: AioOutlineBlock[];   // panjang 10
  faq_questions: string[];      // 5-7
  entity_coverage_checklist: string[];
  internal_link_plan: { anchor_hint: string; target_topic: string }[];
  external_link_plan: { anchor_hint: string; source_type: string }[];
  recency_marker_target: string;
}

/** Output Prompt 3 - statistik self-report dari 1 blok. */
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

/** Output Prompt 3 - 1 blok artikel. Dipanggil 10x oleh Route Handler. */
export interface AioBlockOutput {
  block_index: number;        // 1-10
  h2: string | null;          // H2 aktual yang dipakai, atau null jika tidak ada
  content_markdown: string;   // CommonMark + GFM, tanpa H1
  stats: AioBlockStats;
}

// ============================================================================
// 4. Tipe Argumen Builder & Output Builder
// ============================================================================

/**
 * Argumen generic untuk semua builder. Snapshot hasil prompt sebelumnya
 * dipasang via field opsional (brief, outline, dst) sehingga satu signature
 * bisa handle semua prompt.
 */
export interface AioBuildArgs {
  input: AioInput;
  model: ModelInfo;
  providerId: AioProviderId;
  caps: ProviderCapabilities;

  // Snapshot hasil prompt sebelumnya.
  brief?: AioBriefOutput | null;
  outline?: AioOutlineOutput | null;
  critique?: AioCritiqueOutput | null;
  schemas?: unknown | null;         // AioSchemaOutput - didefinisikan saat builder schema dibuat

  // Snapshot data untuk Prompt 3 (per-bloc loop 10x).
  blockIndex?: number;
  blockSpec?: AioOutlineBlock | null;
  prevBlocksText?: string;          // maks 600 kata konteks blok sebelumnya
  nextBlockTitles?: string[];       // judul blok setelahnya saja (tanpa isi)

  // Snapshot data untuk Prompt 4 (self-critique) dan Prompt 5 (refinement).
  fullArticleMarkdown?: string;
  rewriteTargets?: AioRewriteTarget[];
}

/**
 * Parameter request khusus provider. Caller (Route Handler) yang menerjemahkan
 * ke body API: Gemini -> response_mime_type, OpenAI -> response_format, dll.
 */
export interface AioRequestParams {
  maxTokens: number;
  temperature: number;
  responseMimeType?: "application/json";
  responseFormat?: { type: "json_object" };
}

/**
 * Discriminator untuk memberitahu caller & parser tipe output yang diharapkan.
 * Pakai nama interface sebagai string literal agar JSON-serializable.
 */
export type AioExpectedOutput =
  | { kind: "json"; schema: "AioBriefOutput" }
  | { kind: "json"; schema: "AioOutlineOutput" }
  | { kind: "json"; schema: "AioBlockOutput" }
  | { kind: "json"; schema: "AioCritiqueOutput" }
  | { kind: "json"; schema: "AioRefinementOutput" }
  | { kind: "json"; schema: "AioSchemaOutput" }
  | { kind: "json"; schema: "AioMetaOutput" }
  | { kind: "markdown"; note: "fallback kalau model gagal JSON" };

/** Objek yang dikembalikan builder. */
export interface AioPrompt {
  system: string;
  user: string;
  requestParams: AioRequestParams;
  expectedOutput: AioExpectedOutput;
}

// ============================================================================
// 5. Helper: withProviderAdapters
// ============================================================================

/**
 * Menambahkan instruksi format output sesuai capability provider. Dipanggil
 * di akhir setiap builder agar prompt siap kirim ke API.
 *
 * Aturan:
 * - nativeJsonMode=false (Claude/DeepSeek): tambah tekanan JSON-only.
 * - tendsToWrapInFences: tambah instruksi "first char '{', last char '}'".
 * - tendsToAddChatter: tambah larangan "Tentu/Baik/Here is" di awal.
 * - promptVerbosity=verbose (Claude): tambah "think step by step".
 */
function withProviderAdapters(prompt: AioPrompt, caps: ProviderCapabilities): AioPrompt {
  let { system, user } = prompt;

  if (!caps.nativeJsonMode) {
    system =
      system +
      "\n\nCRITICAL OUTPUT FORMAT:\n" +
      "- Respond with ONLY valid JSON. No markdown code fence (no ```).\n" +
      "- No commentary before or after the JSON.\n" +
      "- No trailing prose.";
    user = user + "\n\nReminder: output JSON only, no prose.";
  }

  if (caps.tendsToWrapInFences) {
    system =
      system +
      "\n- The first character of your response MUST be '{' and the last MUST be '}'.";
  }

  if (caps.tendsToAddChatter) {
    system =
      system +
      "\n- Do not start with 'Tentu', 'Baik', 'Berikut adalah', 'Here is', 'Sure', or any preamble.";
  }

  if (caps.promptVerbosity === "verbose") {
    system = system + "\n\nThink step by step about the constraints above before responding. Then output JSON.";
  }

  return { ...prompt, system, user };
}

// ============================================================================
// 6. Prompt 1: buildResearchPrompt (prototipe)
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 1 (Riset Keyword + Brief).
 *
 * Karakteristik:
 * - Output diharapkan JSON valid sesuai interface AioBriefOutput.
 * - Tidak butuh snapshot dari prompt sebelumnya (brief/outline kosong).
 * - Temperature rendah-medium agar analisis SERP konsisten.
 *
 * Penyesuaian provider via withProviderAdapters() + withRequestParamsForProvider()
 * di akhir.
 */
export function buildResearchPrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps } = args;

  const basePrompt: AioPrompt = {
    system: buildResearchSystemPrompt(input),
    user: buildResearchUserPrompt(input),
    requestParams: {
      maxTokens: 2500,
      temperature: 0.4,
    },
    expectedOutput: { kind: "json", schema: "AioBriefOutput" },
  };

  // Tambah requestParams khusus provider yang mendukung JSON mode.
  const withParams = withRequestParamsForProvider(basePrompt, caps);

  // Tambah instruksi format sesuai capability.
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 1 ----------

function buildResearchSystemPrompt(input: AioInput): string {
  const brandVoice = input.brandVoice || "profesional, jelas, dan mudah dipahami";
  const brandLine = input.brandName ? ` untuk brand ${input.brandName}` : "";

  return (
    "PERAN:\n" +
    "Kamu adalah SEO strategist senior yang terbiasa membuat artikel yang dikutip Google AI Overviews dan Gemini. " +
    "Kamu menggabungkan analisis SERP, entity SEO, dan prinsip E-E-A-T.\n\n" +
    `KONTEKS PENULISAN${brandLine}:\n` +
    `- Audiens: ${input.targetAudience}\n` +
    `- Geo target: ${input.geo}\n` +
    `- Bahasa output: ${input.language}\n` +
    `- Brand voice: ${brandVoice}\n` +
    (input.brandRestrictions ? `- Batasan yang harus dihindari: ${input.brandRestrictions}\n` : "") +
    "\n" +
    "GAYA ANALISIS:\n" +
    "- Gunakan bahasa Indonesia natural untuk semua label dan nilai string dalam output.\n" +
    "- Berikan analisis yang bisa ditindaklanjuti (actionable), bukan generic.\n" +
    "- Setiap klaim data yang spesifik harus menyebutkan sumber awal.\n" +
    "- Jika informasi tidak tersedia, tulis asumsi yang masuk akal dan tandai dengan jelas."
  );
}

function buildResearchUserPrompt(input: AioInput): string {
  const secondaryCsv = (input.secondaryKeywords || []).join(", ");
  const bannedCsv = (input.bannedSources || []).join(", ");

  return (
    "INSTRUKSI:\n" +
    `Lakukan simulasi riset SERP dan entity SEO untuk keyword "${input.keyword}", lalu hasilkan research brief dalam format JSON. ` +
    "Jangan menulis artikel di sini, hanya brief.\n\n" +
    "INPUT RISET:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    (secondaryCsv ? `- Keyword sekunder: ${secondaryCsv}\n` : "") +
    `- Search intent: ${deriveSearchIntent(input)}\n` +
    `- Tipe artikel: ${input.articleType}\n` +
    `- Panjang target: ${input.wordTarget} kata (kisaran 1200-2000)\n` +
    (input.mustMention ? `- Kata/konsep yang WAJIB muncul: ${input.mustMention}\n` : "") +
    (bannedCsv ? `- Sumber yang dilarang: ${bannedCsv}\n` : "") +
    (input.internalLinkBaseUrl ? `- Base URL internal link: ${input.internalLinkBaseUrl}\n` : "") +
    (input.allowedExternalDomains && input.allowedExternalDomains.length
      ? `- Domain eksternal yang diizinkan: ${input.allowedExternalDomains.join(", ")}\n`
      : "") +
    "\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID, tanpa teks di luar JSON):\n" +
    briefJsonSchema() +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid, tanpa markdown code fence, tanpa komentar.\n" +
    "2. \"must_include_facts\" minimal 3, maksimal 6. Setiap fakta harus menyebutkan \"sumber:\" di belakangnya.\n" +
    "3. \"common_questions\" minimal 5.\n" +
    "4. \"content_gap\" wajib diisi dan tidak boleh kosong.\n" +
    "5. Jangan menulis artikel, hanya brief.\n" +
    "6. Gunakan bahasa Indonesia natural untuk semua label dan nilai string.\n" +
    "7. Jangan tambahkan field di luar schema."
  );
}

/** Schema JSON AioBriefOutput sebagai string untuk disisipkan ke prompt. */
function briefJsonSchema(): string {
  return (
    "{\n" +
    "  \"primary_keyword\": \"<keyword utama>\",\n" +
    "  \"search_intent\": \"<informational | commercial | transactional>\",\n" +
    "  \"user_journey_stage\": \"<awareness | consideration | decision>\",\n" +
    "  \"main_entity\": {\n" +
    "    \"name\": \"<entitas utama yang dijelaskan artikel>\",\n" +
    "    \"type\": \"<concept | product | service | person | place | technology>\",\n" +
    "    \"synonyms_id\": [\"<sinonim bahasa Indonesia>\"],\n" +
    "    \"synonyms_en\": [\"<sinonim bahasa Inggris>\"],\n" +
    "    \"related_entities\": [\"<5-8 entitas terkait yang relevan>\"]\n" +
    "  },\n" +
    "  \"serp_signals\": {\n" +
    "    \"top_3_patterns\": [\"<pola H2/H3 yang biasa muncul di 3 hasil teratas SERP>\"],\n" +
    "    \"common_questions\": [\"<5-8 pertanyaan PAA / People Also Ask>\"],\n" +
    "    \"snippet_type_dominant\": \"<definition | list | table | steps>\",\n" +
    "    \"content_gap\": \"<1-2 kalimat gap yang biasanya tidak dijawab kompetitor>\"\n" +
    "  },\n" +
    "  \"unique_value_angle\": \"<1 kalimat sudut pandang yang membedakan artikel ini dari kompetitor>\",\n" +
    "  \"must_include_facts\": [\n" +
    "    \"<fakta/angka/statistik yang WAJIB ada, lengkap dengan sumber awal>\"\n" +
    "  ],\n" +
    "  \"must_avoid\": [\n" +
    "    \"<klaim yang tidak boleh ditulis karena belum terverifikasi>\"\n" +
    "  ],\n" +
    "  \"internal_link_opportunities\": [\n" +
    "    \"<topik artikel cluster yang relevan untuk di-link>\"\n" +
    "  ],\n" +
    "  \"external_source_targets\": [\n" +
    "    \"<jenis sumber otoritatif yang ideal: .gov / .edu / jurnal / Wikipedia>\"\n" +
    "  ],\n" +
    "  \"recency_window\": \"<kisaran tahun data yang masih dianggap baru>\"\n" +
    "}"
  );
}

/**
 * Derivasi search_intent dari keyword (sinyal utama) + articleType (fallback).
 * Analisis keyword lebih akurat karena mencerminkan intent pencari sesungguhnya.
 */
function deriveSearchIntent(input: AioInput): string {
  const kw = (input.keyword || "").toLowerCase();
  const t  = (input.articleType || "").toLowerCase();

  // Sinyal informational dari keyword
  if (/^(cara|how to|langkah|tutorial|panduan|belajar|apa itu|pengertian|kenapa|mengapa|kapan|dimana)/.test(kw)) {
    return "informational";
  }
  // Sinyal commercial dari keyword
  if (/(terbaik|rekomendasi|review|vs\s|perbandingan|worth it|harga|murah|alternatif|top \d|\d terbaik)/.test(kw)) {
    return "commercial";
  }
  // Sinyal transactional dari keyword
  if (/(beli|order|checkout|daftar sekarang|sign up|daftar gratis|diskon|promo|download gratis)/.test(kw)) {
    return "transactional";
  }

  // Fallback ke articleType
  if (t.includes("how-to") || t.includes("panduan") || t.includes("listicle")) return "informational";
  if (t.includes("review") || t.includes("produk") || t.includes("roundup")) return "commercial";
  if (t.includes("landing") || t.includes("press release")) return "transactional";
  return "informational";
}

/**
 * Tambah requestParams khusus provider yang mendukung JSON mode. Dipakai
 * setelah withProviderAdapters() atau sebelum - urut tidak penting karena
 * mengembalikan objek baru.
 *
 * Heuristic:
 * - Claude/DeepSeek (nativeJsonMode=false): biarkan prompt polos.
 * - OpenAI (tendsToAddChatter && sedang): response_format json_object.
 * - Gemini/sumopod/openrouter: response_mime_type application/json.
 */
function withRequestParamsForProvider(
  prompt: AioPrompt,
  caps: ProviderCapabilities,
): AioPrompt {
  if (!caps.nativeJsonMode) {
    return prompt;
  }

  if (caps.tendsToAddChatter && caps.promptVerbosity === "sedang") {
    return {
      ...prompt,
      requestParams: {
        ...prompt.requestParams,
        responseFormat: { type: "json_object" },
      },
    };
  }

  return {
    ...prompt,
    requestParams: {
      ...prompt.requestParams,
      responseMimeType: "application/json",
    },
  };
}

// ============================================================================
// 7. Prompt 2: buildOutlinePrompt
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 2 (Outline Generator SOP-AIO).
 *
 * Karakteristik:
 * - Wajib menerima `args.brief` (output Prompt 1) sebagai source of truth.
 *   Kalau brief null/undefined, fungsi throw - caller harus jalankan Prompt 1 dulu.
 * - Output diharapkan JSON valid sesuai interface AioOutlineOutput (10 blok).
 * - Temperature rendah (0.3) supaya struktur outline konsisten.
 * - Override outline editor user diintegrasikan ke blok yang relevan, bukan diabaikan.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan buildResearchPrompt).
 */
export function buildOutlinePrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps, brief } = args;

  if (!brief) {
    throw new Error(
      "buildOutlinePrompt: args.brief wajib diisi. Jalankan buildResearchPrompt + parser dulu.",
    );
  }

  const basePrompt: AioPrompt = {
    system: buildOutlineSystemPrompt(input, brief),
    user: buildOutlineUserPrompt(input, brief),
    requestParams: {
      maxTokens: 3500,
      temperature: 0.3,
    },
    expectedOutput: { kind: "json", schema: "AioOutlineOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 2 ----------

function buildOutlineSystemPrompt(input: AioInput, brief: AioBriefOutput): string {
  const brandVoice = input.brandVoice || "profesional, jelas, dan mudah dipahami";
  const brandLine = input.brandName ? ` untuk brand ${input.brandName}` : "";

  return (
    "PERAN:\n" +
    "Kamu adalah content architect yang membangun outline artikel SEO dengan struktur 10 blok (SOP-AIO). " +
    "Outline ini akan dipakai sebagai kerangka wajib oleh penulis artikel di Prompt 3.\n\n" +
    `KONTEKS PENULISAN${brandLine}:\n` +
    `- Audiens: ${input.targetAudience}\n` +
    `- Geo target: ${input.geo}\n` +
    `- Bahasa output: ${input.language}\n` +
    `- Brand voice: ${brandVoice}\n` +
    `- Nada: ${input.tone}\n` +
    `- POV: ${input.pov}\n` +
    `- Keterbacaan: ${input.readability}\n` +
    (input.brandRestrictions ? `- Batasan yang harus dihindari: ${input.brandRestrictions}\n` : "") +
    (input.recencyMarker ? `- Recency marker target: ${input.recencyMarker}\n` : "") +
    "\n" +
    "BRIEF DARI PROMPT 1 (source of truth - jangan dilanggar):\n" +
    `- Keyword utama: ${brief.primary_keyword}\n` +
    `- Search intent: ${brief.search_intent}\n` +
    `- User journey: ${brief.user_journey_stage}\n` +
    `- Main entity: ${brief.main_entity.name} (${brief.main_entity.type})\n` +
    `- Sinonim ID: ${brief.main_entity.synonyms_id.join(", ") || "-"}\n` +
    `- Sinonim EN: ${brief.main_entity.synonyms_en.join(", ") || "-"}\n` +
    `- Related entities (WAJIB muncul): ${brief.main_entity.related_entities.join(", ") || "-"}\n` +
    `- Snippet type dominan: ${brief.serp_signals.snippet_type_dominant}\n` +
    `- Common questions: ${brief.serp_signals.common_questions.join(" | ") || "-"}\n` +
    `- Content gap: ${brief.serp_signals.content_gap}\n` +
    `- Unique value angle: ${brief.unique_value_angle}\n` +
    `- Must-include facts: ${brief.must_include_facts.join(" | ") || "-"}\n` +
    `- Recency window: ${brief.recency_window}\n` +
    "\n" +
    "ATURAN OUTLINE:\n" +
    "- Tepat 10 blok, urutan sesuai SOP-AIO (Hook, Definisi, Why it matters, Core Framework, Perbandingan+Tabel, Step-by-step, FAQ, Common Mistakes, Conclusion+CTA, Sources).\n" +
    "- Tiap blok WAJIB punya direct_answer 40-60 kata. Tanpa direct_answer, blok ditolak.\n" +
    "- entity_coverage_checklist WAJIB memuat semua related_entities dari brief.\n" +
    "- Judul mengandung keyword utama, slug lowercase + hubung, meta_description mengandung keyword.\n" +
    "- Jangan menulis isi artikel di sini, hanya outline + meta."
  );
}

function buildOutlineUserPrompt(input: AioInput, brief: AioBriefOutput): string {
  const secondaryCsv = (input.secondaryKeywords || []).join(", ");
  const override = input.userOutlineOverride?.trim();
  const internalBase = input.internalLinkBaseUrl || "";

  // Ringkas brief untuk user prompt (system prompt sudah punya versi lengkap).
  const briefJsonInline = briefAsInlineJson(brief);

  return (
    "INSTRUKSI:\n" +
    `Buat outline artikel 10 blok (SOP-AIO) untuk keyword "${input.keyword}". ` +
    "Setiap blok harus punya target kata, tujuan, dan TODO yang bisa langsung dieksekusi Prompt 3.\n\n" +
    "INPUT DARI USER:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    (secondaryCsv ? `- Keyword sekunder: ${secondaryCsv}\n` : "") +
    (input.userTitle ? `- Judul pilihan user: ${input.userTitle}\n` : `- Judul pilihan user: (kosong = generate)`) +
    `- Tipe artikel: ${input.articleType}\n` +
    `- Panjang target: ${input.wordTarget} kata\n` +
    `- Nada: ${input.tone}\n` +
    `- POV: ${input.pov}\n` +
    `- Keterbacaan: ${input.readability}\n` +
    `- Brand voice: ${input.brandVoice || "-"}\n` +
    (override ? `- Override outline editor: ${override}\n` : "") +
    (internalBase ? `- Base URL internal link: ${internalBase}\n` : "") +
    (input.internalLinkPages?.trim()
      ? `- Halaman internal yang TERSEDIA (gunakan HANYA URL ini, jangan buat slug baru):\n${input.internalLinkPages.trim()}\n`
      : "") +
    (input.allowedExternalDomains && input.allowedExternalDomains.length
      ? `- Domain eksternal yang diizinkan: ${input.allowedExternalDomains.join(", ")}\n`
      : "") +
    "\n" +
    "BRIEF (dari Prompt 1, JSON ringkas):\n" +
    briefJsonInline +
    "\n\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID, tanpa teks di luar JSON):\n" +
    outlineJsonSchema() +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid, tanpa markdown code fence, tanpa komentar.\n" +
    `2. Total target_words seluruh blok harus mendekati ${input.wordTarget} kata +- 10%. Hitung: sum(target_words) harus dalam [${Math.round(input.wordTarget * 0.9)}, ${Math.round(input.wordTarget * 1.1)}].\n` +
    "3. Tiap blok WAJIB punya direct_answer 40-60 kata. Tanpa direct answer, blok ditolak.\n" +
    "4. faq_questions minimal 5, maksimal 7. Pertanyaan harus berbeda dengan H2.\n" +
    "5. entity_coverage_checklist WAJIB memuat semua item dari brief.main_entity.related_entities.\n" +
    "6. Jika override outline editor diisi, INTEGRASIKAN ke blok yang relevan, jangan diabaikan.\n" +
    "7. title mengandung keyword utama. slug hanya huruf kecil, angka, dan tanda hubung. meta_description mengandung keyword dan call-to-value yang jelas.\n" +
    "8. Jangan menulis isi artikel di sini, hanya outline.\n" +
    (input.internalLinkPages?.trim()
      ? "9. internal_link_plan WAJIB menggunakan HANYA URL yang ada di daftar halaman internal di atas. DILARANG membuat slug atau URL baru yang tidak ada di daftar.\n"
      : "9. internal_link_plan: anchor_hint harus relevan dengan konten blok.\n") +
    "10. Jangan tambahkan field di luar schema."
  );
}

/** Schema JSON AioOutlineOutput sebagai string untuk disisipkan ke prompt. */
function outlineJsonSchema(): string {
  return (
    "{\n" +
    "  \"title\": \"<H1 final, 50-60 karakter, mengandung keyword utama>\",\n" +
    "  \"slug\": \"<3-5 kata, lowercase, pisah tanda hubung>\",\n" +
    "  \"meta_description\": \"<130-155 karakter, mengandung keyword>\",\n" +
    "  \"outline\": [\n" +
    "    {\n" +
    "      \"block\": 1,\n" +
    "      \"name\": \"Hook + TL;DR\",\n" +
    "      \"h2\": \"<H2 untuk blok ini, atau null jika tidak pakai H2>\",\n" +
    "      \"target_words\": <40-60>,\n" +
    "      \"purpose\": \"<1 kalimat tujuan blok>\",\n" +
    "      \"direct_answer\": \"<paragraf direct answer 40-60 kata>\",\n" +
    "      \"must_include\": [\"<elemen yang WAJIB ada>\"],\n" +
    "      \"format\": [\"<bullet | numbered | table | paragraph | quote>\"]\n" +
    "    },\n" +
    "    { \"block\": 2, \"name\": \"Definisi\", \"h2\": \"...\", \"target_words\": 60, ... },\n" +
    "    { \"block\": 3, \"name\": \"Why it matters\", \"h2\": \"...\", \"target_words\": 80, ... },\n" +
    "    { \"block\": 4, \"name\": \"Core Framework\", \"h2\": \"...\", \"target_words\": 180, ... },\n" +
    "    { \"block\": 5, \"name\": \"Perbandingan + Tabel\", \"h2\": \"...\", \"target_words\": 120, ... },\n" +
    "    { \"block\": 6, \"name\": \"Step-by-step Guide\", \"h2\": \"...\", \"target_words\": 250, ... },\n" +
    "    { \"block\": 7, \"name\": \"FAQ\", \"h2\": \"FAQ\", \"target_words\": 150, ... },\n" +
    "    { \"block\": 8, \"name\": \"Common Mistakes\", \"h2\": \"...\", \"target_words\": 100, ... },\n" +
    "    { \"block\": 9, \"name\": \"Conclusion + CTA\", \"h2\": \"Kesimpulan\", \"target_words\": 70, ... },\n" +
    "    { \"block\": 10, \"name\": \"Sources\", \"h2\": \"Sumber Referensi\", \"target_words\": 40, ... }\n" +
    "  ],\n" +
    "  \"faq_questions\": [\n" +
    "    \"<5-7 pertanyaan FAQ yang akan dijawab di blok 7>\"\n" +
    "  ],\n" +
    "  \"entity_coverage_checklist\": [\n" +
    "    \"<entitas yang WAJIB muncul minimal 1x di artikel>\"\n" +
    "  ],\n" +
    "  \"internal_link_plan\": [\n" +
    "    { \"anchor_hint\": \"<frasa anchor>\", \"target_topic\": \"<topik artikel cluster>\" }\n" +
    "  ],\n" +
    "  \"external_link_plan\": [\n" +
    "    { \"anchor_hint\": \"<frasa anchor>\", \"source_type\": \"<jenis sumber>\" }\n" +
    "  ],\n" +
    "  \"recency_marker_target\": \"<tahun/angka yang akan disisipkan>\"\n" +
    "}"
  );
}

/**
 * Ringkas brief jadi string JSON satu-baris untuk disisipkan ke user prompt.
 * Field yang terlalu panjang (related_entities, must_include_facts) dipotong
 * agar tidak membengkak. System prompt sudah punya versi lengkap.
 */
function briefAsInlineJson(brief: AioBriefOutput): string {
  const clipped = {
    primary_keyword: brief.primary_keyword,
    search_intent: brief.search_intent,
    user_journey_stage: brief.user_journey_stage,
    main_entity: {
      name: brief.main_entity.name,
      type: brief.main_entity.type,
      synonyms_id: brief.main_entity.synonyms_id.slice(0, 5),
      synonyms_en: brief.main_entity.synonyms_en.slice(0, 5),
      related_entities: brief.main_entity.related_entities,
    },
    serp_signals: {
      snippet_type_dominant: brief.serp_signals.snippet_type_dominant,
      common_questions: brief.serp_signals.common_questions,
      content_gap: brief.serp_signals.content_gap,
    },
    unique_value_angle: brief.unique_value_angle,
    must_include_facts: brief.must_include_facts,
    must_avoid: brief.must_avoid,
    recency_window: brief.recency_window,
  };
  return JSON.stringify(clipped, null, 0);
}

// ============================================================================
// 8. Prompt 3: buildBlockPrompt (per-bloc, dipanggil 10x oleh Route Handler)
// ============================================================================

/** Konstanta nama 10 blok sesuai SOP-AIO, urut block_index 1-10. */
const BLOCK_NAMES: AioBlockName[] = [
  "Hook + TL;DR",
  "Definisi",
  "Why it matters",
  "Core Framework",
  "Perbandingan + Tabel",
  "Step-by-step Guide",
  "FAQ",
  "Common Mistakes",
  "Conclusion + CTA",
  "Sources",
];

/** Guardrail: apakah blok ini boleh tanpa H1. */
function blockCanSkipH1(name: AioBlockName): boolean {
  return name === "Hook + TL;DR" || name === "Conclusion + CTA";
}

/** Guardrail: apakah blok ini boleh tanpa direct_answer 40-60 kata di paragraf pertama. */
function blockRequiresDirectAnswer(name: AioBlockName): boolean {
  return !blockCanSkipH1(name);
}

/**
 * Membangun system + user prompt untuk Prompt 3 (Blok Penulisan).
 *
 * Karakteristik:
 * - Dipanggil 10x oleh Route Handler dengan `blockIndex` 1-10.
 * - Wajib menerima `args.outline` (AioOutlineOutput dari Prompt 2).
 * - Wajib menerima `args.blockSpec` (1 elemen AioOutlineBlock sesuai index).
 * - `args.blockIndex` dan `args.blockSpec.block` HARUS cocok, kalau tidak throw.
 * - Output diharapkan JSON valid sesuai AioBlockOutput.
 * - Temperature 0.7 (medium-tinggi) agar penulisan natural, tidak formulaik.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan buildResearchPrompt + buildOutlinePrompt).
 */
export function buildBlockPrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps, outline, blockIndex, blockSpec, prevBlocksText, nextBlockTitles } = args;

  if (!outline) {
    throw new Error(
      "buildBlockPrompt: args.outline wajib diisi. Jalankan buildOutlinePrompt + parser dulu.",
    );
  }
  if (typeof blockIndex !== "number" || blockIndex < 1 || blockIndex > 10) {
    throw new Error(
      `buildBlockPrompt: args.blockIndex harus 1-10, dapat ${String(blockIndex)}.`,
    );
  }
  if (!blockSpec) {
    throw new Error(
      `buildBlockPrompt: args.blockSpec wajib diisi untuk block_index=${blockIndex}.`,
    );
  }
  if (blockSpec.block !== blockIndex) {
    throw new Error(
      `buildBlockPrompt: args.blockSpec.block (${blockSpec.block}) tidak cocok dengan args.blockIndex (${blockIndex}).`,
    );
  }
  if (blockSpec.name !== BLOCK_NAMES[blockIndex - 1]) {
    throw new Error(
      `buildBlockPrompt: blockSpec.name (${blockSpec.name}) bukan blok #${blockIndex} yang valid (expected: ${BLOCK_NAMES[blockIndex - 1]}).`,
    );
  }

  const basePrompt: AioPrompt = {
    system: buildBlockSystemPrompt(input, blockSpec),
    user: buildBlockUserPrompt(
      input,
      outline,
      blockIndex,
      blockSpec,
      prevBlocksText,
      nextBlockTitles,
      args.brief,
    ),
    requestParams: {
      maxTokens: 2000,
      temperature: 0.7,
    },
    expectedOutput: { kind: "json", schema: "AioBlockOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 3 ----------

function buildBlockSystemPrompt(input: AioInput, blockSpec: AioOutlineBlock): string {
  const brandVoice = input.brandVoice || "profesional, jelas, dan mudah dipahami";
  const canSkipH1 = blockCanSkipH1(blockSpec.name);
  const requiresDirect = blockRequiresDirectAnswer(blockSpec.name);

  return (
    "PERAN:\n" +
    "Kamu adalah penulis artikel SEO profesional. " +
    "Kamu sedang menulis 1 blok dari 10 blok artikel sesuai SOP-AIO. " +
    "Tugasmu: hasilkan JSON berisi content_markdown untuk blok ini SAJA.\n\n" +
    "KONTEKS BRAND:\n" +
    `- Brand: ${input.brandName}\n` +
    `- Audiens: ${input.targetAudience}\n` +
    `- Geo: ${input.geo}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Brand voice: ${brandVoice}\n` +
    `- Nada: ${input.tone}\n` +
    `- POV: ${input.pov}\n` +
    `- Keterbacaan: ${input.readability}\n` +
    (input.recencyMarker ? `- Recency marker: ${input.recencyMarker}\n` : "") +
    (input.authorName ? `- Penulis: ${input.authorName}\n` : "") +
    (input.internalLinkBaseUrl ? `- Base URL internal link: ${input.internalLinkBaseUrl}\n` : "") +
    (input.internalLinkPages?.trim()
      ? `- URL internal yang BOLEH digunakan (HANYA ini, jangan buat URL baru):\n${input.internalLinkPages.trim()}\n`
      : "") +
    (input.noExternalLinks ? "- ATURAN LINK: DILARANG KERAS menambahkan link ke domain eksternal apapun. Semua hyperlink harus ke URL internal di atas.\n" : "") +
    "\n" +
    "GAYA TULIS:\n" +
    "- Kalimat deklaratif, subjek-predikat-objek jelas.\n" +
    "- Hindari kata: mungkin, biasanya, sebaiknya, Anda bisa, kita bisa.\n" +
    "- Tiap paragraf 1 ide utama, maksimal 120 kata.\n" +
    "- Langsung ke jawaban, tidak ada basa-basi pembuka.\n" +
    "\n" +
    "ATURAN E-E-A-T:\n" +
    "- Tunjukkan pengalaman konkret (contoh implementasi, studi kasus, angka riil).\n" +
    "- Cantumkan sumber untuk setiap klaim numerik/ilmiah.\n" +
    "- Transparan tentang batasan pengetahuan.\n" +
    "\n" +
    `ATURAN BLOK #${blockSpec.block} (${blockSpec.name}):\n` +
    `- Target panjang: ${blockSpec.target_words} kata.\n` +
    (canSkipH1
      ? "- Blok ini boleh TIDAK memiliki H2 jika tidak relevan (Hook + Conclusion).\n"
      : `- WAJIB ada H2 di awal blok: ${blockSpec.h2 || "<sesuaikan dengan topik>"}\n`) +
    (requiresDirect
      ? "- WAJIB paragraf direct_answer 40-60 kata di awal blok, langsung menjawab intent section.\n"
      : "- Boleh tanpa direct_answer eksplisit, tetap ringkas.\n") +
    `- Elemen yang harus ada: ${blockSpec.must_include.join(", ") || "-"}\n` +
    `- Format yang dipakai: ${blockSpec.format.join(", ") || "paragraph"}\n` +
    "\n" +
    "ATURAN KHUSUS AI OVERVIEW:\n" +
    "- Setiap seksi H2 harus bisa dipahami sebagai standalone passage — tulis seolah Google hanya mengambil seksi ini untuk ditampilkan di AI Overview tanpa konteks blok lain.\n" +
    "- Paragraf pertama tiap seksi = jawaban/definisi langsung, bukan intro atau transisi antar-blok.\n" +
    "- Hindari anafora antar-blok ('Seperti yang disebutkan sebelumnya', 'Pada bagian sebelumnya').\n" +
    "\n" +
    "LARANGAN:\n" +
    "- Jangan menuliskan instruksi prompt ini di output.\n" +
    "- Jangan menulis ulang H1 artikel (H1 hanya di luar blok ini).\n" +
    "- Jangan menulis isi blok lain (1-9 atau 11+) di sini.\n" +
    "- Jangan klaim angka tanpa menyebut sumber.\n" +
    "- Jangan paragraf > 120 kata."
  );
}

function buildBlockUserPrompt(
  input: AioInput,
  outline: AioOutlineOutput,
  blockIndex: number,
  blockSpec: AioOutlineBlock,
  prevBlocksText: string | undefined,
  nextBlockTitles: string[] | undefined,
  brief: AioBriefOutput | null | undefined,
): string {
  // Outline ringkas untuk koherensi antar-blok.
  const outlineInline = JSON.stringify(
    {
      title: outline.title,
      slug: outline.slug,
      meta_description: outline.meta_description,
      faq_questions: outline.faq_questions,
      entity_coverage_checklist: outline.entity_coverage_checklist,
      internal_link_plan: outline.internal_link_plan,
      external_link_plan: outline.external_link_plan,
      recency_marker_target: outline.recency_marker_target,
    },
    null,
    0,
  );

  // Daftar entity yang harus muncul di blok ini (sub-coverage dari checklist).
  const entitiesForBlock = pickEntitiesForBlock(outline, blockIndex);

  // Subset link plan yang relevan untuk blok ini (berdasarkan anchor_hint proximity).
  const internalLinkForBlock = pickLinksForBlock(outline.internal_link_plan, blockSpec, 2);
  const externalLinkForBlock = pickLinksForBlock(outline.external_link_plan, blockSpec, 1);

  // Fakta wajib dari brief — distribusi round-robin per blok supaya tiap blok dapat porsi fakta.
  const allFacts = brief?.must_include_facts || [];
  const factsForBlock = allFacts.length > 0
    ? allFacts.filter((_, idx) => idx % 10 === (blockIndex - 1) % allFacts.length || idx % 10 === blockIndex % allFacts.length)
    : [];
  const mustIncludeFactsCsv = factsForBlock.length > 0
    ? factsForBlock.join(" | ")
    : "cantumkan data/angka spesifik yang relevan dengan topik blok ini (dengan sebutan sumber)";

  // Judul blok setelahnya saja, supaya tidak bocor isi.
  const nextTitles = (nextBlockTitles || []).join(" | ") || "(tidak ada)";

  return (
    "INSTRUKSI:\n" +
    `Kamu sedang menulis BLOK #${blockIndex} dari 10 untuk artikel SEO yang akan dikutip Google AI Overviews. ` +
    "Tulis HANYA isi blok ini, dalam format JSON sesuai schema di bawah.\n\n" +
    "INFORMASI ARTIKEL:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    `- Judul H1: ${outline.title}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Nada: ${input.tone} | POV: ${input.pov} | Keterbacaan: ${input.readability}\n` +
    (input.recencyMarker ? `- Recency marker: ${input.recencyMarker}\n` : "") +
    "\n" +
    "OUTLINE LENGKAP (supaya koherensi antar-blok terjaga):\n" +
    outlineInline +
    "\n\n" +
    `BLOK YANG SEDANG DITULIS (block_index = ${blockIndex}):\n` +
    JSON.stringify(blockSpec, null, 0) +
    "\n\n" +
    "KONTEKS BLOK SEBELUMNYA (supaya transisi natural, maks 600 kata):\n" +
    (prevBlocksText && prevBlocksText.trim()
      ? prevBlocksText.slice(0, 3000) + "\n"
      : "(blok #1 - tidak ada blok sebelumnya)\n") +
    "\n" +
    "KONTEKS BLOK SESUDAH (judul saja, supaya tidak bocor isi):\n" +
    nextTitles +
    "\n\n" +
    "YANG WAJIB MUNCUL DI BLOK INI:\n" +
    `- Entity: ${entitiesForBlock.join(", ") || "-"}\n` +
    `- Internal link plan: ${internalLinkForBlock.map((l) => l.anchor_hint).join(" | ") || "-"}\n` +
    (input.noExternalLinks
      ? "- External link: DILARANG — jangan tambahkan link ke domain eksternal apapun.\n"
      : `- External link plan: ${externalLinkForBlock.map((l) => l.anchor_hint).join(" | ") || "-"}\n`) +
    `- Fakta/angka yang wajib: ${mustIncludeFactsCsv}\n` +
    "\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID, tanpa teks di luar JSON):\n" +
    blockJsonSchema(blockSpec, input) +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid sesuai schema di atas, tanpa markdown code fence.\n" +
    `2. Total panjang content_markdown harus dalam ${blockSpec.target_words} kata +- 15% (yaitu ${Math.round(blockSpec.target_words * 0.85)}-${Math.round(blockSpec.target_words * 1.15)} kata).\n` +
    "3. Paragraf pertama direct_answer 40-60 kata (kecuali blok 1 Hook + TL;DR dan blok 9 Conclusion + CTA).\n" +
    "4. Heading level konsisten: ## untuk H2 utama blok, ### untuk sub-bagian. JANGAN tulis ulang H1.\n" +
    "5. Untuk blok 5 (Perbandingan): WAJIB ada 1 tabel Markdown minimal 3 kolom x 3 baris.\n" +
    "6. Untuk blok 6 (Step-by-step): WAJIB pakai ordered list bernomor.\n" +
    "7. Untuk blok 7 (FAQ): WAJIB format '### P: ...' lalu jawaban 1-3 kalimat, total 5-7 Q dari outline.faq_questions.\n" +
    "8. Untuk blok 10 (Sources): WAJIB daftar minimal 3 sumber otoritatif. Format: '- **Nama Sumber** — Jenis sumber (jurnal/situs resmi/buku/lembaga) — Tahun'. Cantumkan nama sumber saja tanpa URL kecuali URL benar-benar diketahui dan valid.\n" +
    (input.internalLinkPages?.trim()
      ? "9. Internal link: WAJIB gunakan URL PERSIS dari daftar URL internal yang tercantum di system prompt. DILARANG menambah path, slug, atau suffix apapun. Contoh benar: [anchor](https://domain.com/halaman). Contoh salah: [anchor](https://domain.com/slug-yang-dikarang).\n"
      : "9. Internal link Markdown: [anchor](URL) dengan base URL dari input.internalLinkBaseUrl.\n") +
    (input.noExternalLinks
      ? "10. DILARANG KERAS: Jangan sertakan link ke domain eksternal apapun (iec.ch, se.com, dll). Hanya boleh link internal.\n"
      : "10. External link Markdown: [anchor](URL) sesuai outline.external_link_plan.\n") +
    `11. Recency marker '${input.recencyMarker || input.publishDate.slice(0, 4)}' muncul minimal 1x di SELURUH artikel; jika blok ini tempat yang cocok, selipkan natural.\n` +
    "12. Tulis SELALU dalam bahasa yang sama dengan input.language.\n" +
    "13. Jangan tulis catatan meta, prompt reflection, atau komentar di luar JSON."
  );
}

/** Schema JSON AioBlockOutput sebagai string untuk disisipkan ke prompt. */
function blockJsonSchema(blockSpec: AioOutlineBlock, input: AioInput): string {
  return (
    "{\n" +
    `  "block_index": ${blockSpec.block},\n` +
    `  "h2": "<H2 aktual yang dipakai untuk blok ini, atau null jika tidak ada>",\n` +
    "  \"content_markdown\": \"<isi blok dalam Markdown. Wajib:\n" +
    "    1) " + (blockRequiresDirectAnswer(blockSpec.name)
      ? "Diawali paragraf direct_answer 40-60 kata."
      : "Boleh ringkas, tanpa direct_answer eksplisit.") + "\n" +
    "    2) Total panjang sesuai target_words +- 15%.\n" +
    "    3) Setiap paragraf maks 120 kata.\n" +
    "    4) Pakai ## untuk H2 utama blok, ### untuk sub-bagian. TIDAK BOLEH tulis H1.\n" +
    "    5) Pakai Markdown CommonMark + GFM (tabel, list, link).\n" +
    "    6) Untuk blok 5: WAJIB 1 tabel Markdown 3 kolom x 3 baris.\n" +
    "    7) Untuk blok 6: WAJIB ordered list bernomor.\n" +
    "    8) Untuk blok 7: WAJIB format '### P: ...' dengan 5-7 Q dari outline.faq_questions.\n" +
    "    9) Untuk blok 10: WAJIB daftar 3+ sumber otoritatif. Format: '- **Nama Sumber** — Jenis sumber — Tahun'. JANGAN generate URL palsu — hanya gunakan URL dari domain yang sudah diverifikasi (allowedExternalDomains / internalLinkBaseUrl).\n" +
    "    10) Internal link: [anchor](URL) sesuai base URL.\n" +
    "    11) External link: [anchor](URL) sesuai external link plan.\n" +
    `    12) Recency marker '${input.recencyMarker || input.publishDate.slice(0, 4)}' selipkan natural jika belum ada di seluruh artikel sampai blok ini.>\",\n` +
    "  \"stats\": {\n" +
    "    \"word_count\": <jumlah kata content_markdown>,\n" +
    "    \"has_direct_answer\": <true | false>,\n" +
    "    \"has_table\": <true | false>,\n" +
    "    \"has_ordered_list\": <true | false>,\n" +
    "    \"internal_links_used\": [\"<anchor yang dipakai>\"],\n" +
    "    \"external_links_used\": [\"<anchor yang dipakai>\"],\n" +
    "    \"entities_mentioned\": [\"<entity yang muncul di blok ini>\"],\n" +
    "    \"recency_marker_present\": <true | false>\n" +
    "  }\n" +
    "}"
  );
}

/**
 * Pilih subset entity dari outline.entity_coverage_checklist yang harus muncul
 * di blok ini. Distribusi round-robin sederhana: 10 blok, bagi rata.
 */
function pickEntitiesForBlock(outline: AioOutlineOutput, blockIndex: number): string[] {
  const all = outline.entity_coverage_checklist || [];
  if (all.length === 0) return [];
  const total = 10;
  const perBlock = Math.max(1, Math.ceil(all.length / total));
  const start = (blockIndex - 1) * perBlock;
  return all.slice(start, start + perBlock);
}

/**
 * Pilih subset link plan untuk blok ini. Heuristic: cocokkan anchor_hint dengan
 * kata kunci di blockSpec.purpose + must_include.
 */
function pickLinksForBlock<T extends { anchor_hint: string }>(
  plan: T[] | undefined,
  blockSpec: AioOutlineBlock,
  max: number,
): T[] {
  if (!plan || plan.length === 0) return [];
  const haystack = (blockSpec.purpose + " " + blockSpec.must_include.join(" ")).toLowerCase();
  const scored = plan
    .map((link) => {
      const tokens = link.anchor_hint.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const score = tokens.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
      return { link, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.link);
}

// ============================================================================
// 3b. Tipe Output Tambahan (Prompt 4: Self-Critique)
//     Disisipkan di sini karena forward-reference ke AioBuildArgs.critique
//     yang dideklarasikan unknown di Bagian 4. Tipe konkret didefinisikan
//     setelahnya sehingga compiler bisa narrowing penuh.
// ============================================================================

/** Status per poin quality gate. */
export type AioCriterionStatus = "lulus" | "gagal" | "tidak_bisa_dinilai";

/** 1 elemen di dalam array AioCritiqueOutput.criteria. */
export interface AioCriterion {
  id: number;                       // 1-13
  name: string;
  score: 0 | 100;                   // binary
  status: AioCriterionStatus;
  evidence: string;                 // kutipan 5-20 kata dari artikel
  issue: string;                    // diagnosis kenapa lulus/gagal
  fix_instruction: string | null;   // instruksi konkret untuk Prompt 5
}

export type AioRewritePriority = "tinggi" | "sedang" | "rendah";

/** Target blok yang harus ditulis ulang oleh Prompt 5. */
export interface AioRewriteTarget {
  block_index: number;              // 1-10
  h2: string | null;
  reason: string;
  priority: AioRewritePriority;
}

/**
 * Output Prompt 4 - hasil self-critique terhadap 13 poin Quality Gate.
 * Field `is_passed` + `qa_score` + `violations` + `critique_notes` adalah
 * wrapper ringan yang diminta klien; field detail per poin dan
 * `rewrite_targets` dipakai oleh Prompt 5.
 */
export interface AioCritiqueOutput {
  // Wrapper ringkas untuk klien / dashboard.
  is_passed: boolean;               // true jika verdict === "lulus"
  qa_score: number;                 // 0-100, alias overall_score
  violations: string[];             // daftar fix_instruction dari poin yang gagal
  critique_notes: string;           // 2-3 kalimat ringkasan kondisi artikel

  // Field detail untuk Prompt 5 dan audit.
  overall_score: number;            // 0-100
  verdict: "lulus" | "perlu_revisi" | "gagal";
  summary: string;                  // alias critique_notes
  criteria: AioCriterion[];         // panjang 13, urut id 1-13
  global_issues: string[];
  rewrite_targets: AioRewriteTarget[]; // hanya blok yang gagal
}

// ============================================================================
// 9. Prompt 4: buildCritiquePrompt (Quality Gate 13 Poin)
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 4 (Self-Critique).
 *
 * Karakteristik:
 * - Wajib menerima `args.fullArticleMarkdown` (gabungan 10 blok dari Prompt 3).
 * - Wajib menerima `args.outline` (AioOutlineOutput) untuk referensi H2/H3.
 * - Output diharapkan JSON valid sesuai AioCritiqueOutput.
 * - Temperature rendah (0.2) supaya penilaian konsisten antar pemanggilan.
 * - Field `expectedOutput` AioCritiqueOutput sudah ada di AioExpectedOutput.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan builder sebelumnya).
 */
export function buildCritiquePrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps, outline, fullArticleMarkdown } = args;

  if (!fullArticleMarkdown || fullArticleMarkdown.trim().length < 100) {
    throw new Error(
      "buildCritiquePrompt: args.fullArticleMarkdown wajib diisi dan minimal 100 karakter. Jalankan buildBlockPrompt 10x dulu.",
    );
  }
  if (!outline) {
    throw new Error(
      "buildCritiquePrompt: args.outline wajib diisi untuk referensi H2/H3.",
    );
  }

  const basePrompt: AioPrompt = {
    system: buildCritiqueSystemPrompt(input),
    user: buildCritiqueUserPrompt(input, outline, fullArticleMarkdown),
    requestParams: {
      maxTokens: 3000,
      temperature: 0.2,
    },
    expectedOutput: { kind: "json", schema: "AioCritiqueOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 4 ----------

function buildCritiqueSystemPrompt(input: AioInput): string {
  return (
    "PERAN:\n" +
    "Kamu adalah senior SEO editor yang ketat dan teliti. " +
    "Tugasmu adalah menilai artikel SEO terhadap 13 Poin Quality Gate sebelum dipublikasikan. " +
    "Kamu TIDAK menulis ulang artikel - hanya memberi verdict per poin dengan bukti kutipan dan instruksi perbaikan.\n\n" +
    "KONTEKS PENILAIAN:\n" +
    `- Brand: ${input.brandName}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Keyword utama: ${input.keyword}\n` +
    (input.recencyMarker ? `- Recency marker: ${input.recencyMarker}\n` : "") +
    "- Standar: praktik terbaik Google AI Overviews 2025-2026 dan E-E-A-T.\n" +
    "\n" +
    "ATURAN PENILAIAN:\n" +
    "- Jika ragu antara 'lulus' dan 'gagal', pilih 'gagal'. Lebih ketat lebih baik.\n" +
    "- Untuk setiap poin, sertakan kutipan 5-20 kata dari artikel sebagai bukti.\n" +
    "- Jika poin tidak bisa dinilai (misal data hilang), tandai 'tidak_bisa_dinilai' dan jelaskan.\n" +
    "- Skor per poin hanya 0 atau 100 (binary), bukan rentang.\n" +
    "- overall_score = rata-rata dari 13 poin. verdict: lulus >= 85, perlu_revisi 60-84, gagal < 60.\n" +
    "- rewrite_targets hanya berisi blok yang gagal (status != 'lulus'), diurutkan priority descending.\n" +
    "\n" +
    "DETEKSI KHUSUS:\n" +
    "- Kalimat pembuka klise: 'Pada artikel ini', 'Di era digital', 'Seiring perkembangan teknologi', 'Tidak bisa dipungkiri', 'Seperti yang kita tahu', 'Halo pembaca', 'Selamat datang di', 'Pernahkah Anda berpikir' - tandai sebagai bagian dari Poin 6 (Direct Answer) gagal.\n" +
    "- Heading generik: 'Pendahuluan', 'Kesimpulan', 'Penutup' saja tanpa isi spesifik - tandai sebagai Poin 1 (TL;DR) atau Poin 6 (Direct Answer) gagal.\n" +
    "- Klaim tanpa spek data: 'banyak orang', 'mayoritas pengguna', 'sebagian besar', 'umumnya', 'kebanyakan' - tandai sebagai Poin 13 (Klaim Numerik) gagal.\n" +
    "- Validasi keakuratan spek data: setiap angka harus diikuti 'sumber:', 'menurut', 'berdasarkan data', atau nama lembaga resmi."
  );
}

function buildCritiqueUserPrompt(
  input: AioInput,
  outline: AioOutlineOutput,
  fullArticleMarkdown: string,
): string {
  const secondaryCsv = (input.secondaryKeywords || []).join(", ");
  const internalBase = input.internalLinkBaseUrl || "";
  const allowedExt = (input.allowedExternalDomains || []).join(", ") || "(tidak ada)";

  return (
    "INSTRUKSI:\n" +
    `Nilai artikel SEO di bawah ini terhadap 13 Poin Quality Gate. ` +
    "Berikan verdict per poin (lulus/gagal), skor 0 atau 100, bukti kutipan 5-20 kata, dan instruksi perbaikan yang bisa langsung dijalankan oleh Prompt 5.\n\n" +
    "DATA ARTIKEL:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    (secondaryCsv ? `- Keyword sekunder: ${secondaryCsv}\n` : "") +
    `- Tipe artikel: ${input.articleType}\n` +
    `- Brand: ${input.brandName}\n` +
    `- Judul H1: ${outline.title}\n` +
    `- Tanggal publikasi: ${input.publishDate}\n` +
    `- Recency marker target: ${input.recencyMarker || input.publishDate.slice(0, 4)}\n` +
    (internalBase ? `- Base URL internal link: ${internalBase}\n` : "") +
    (input.noExternalLinks
      ? "- Mode external link: DILARANG KERAS — tidak ada external link sama sekali. Poin 8 (external) harus otomatis LULUS.\n"
      : `- Domain eksternal yang diizinkan: ${allowedExt}\n`) +
    "\n" +
    "OUTLINE REFERENSI (untuk cek koherensi heading):\n" +
    JSON.stringify(
      {
        title: outline.title,
        meta_description: outline.meta_description,
        outline: outline.outline.map((b) => ({ block: b.block, name: b.name, h2: b.h2, target_words: b.target_words })),
        faq_questions: outline.faq_questions,
        recency_marker_target: outline.recency_marker_target,
      },
      null,
      0,
    ) +
    "\n\n" +
    "ARTIKEL LENGKAP (Markdown, sudah digabung dari 10 blok):\n" +
    fullArticleMarkdown +
    "\n\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID, tanpa teks di luar JSON):\n" +
    critiqueJsonSchema() +
    "\n" +
    "PEDOMAN DETAIL PER 13 POIN:\n" +
    qg13DetailGuide(input) +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid sesuai schema, tanpa markdown code fence, tanpa komentar.\n" +
    "2. Skor per poin hanya 0 atau 100, bukan rentang.\n" +
    "3. rewrite_targets hanya berisi blok yang gagal (status != 'lulus'), diurutkan priority descending (tinggi dulu).\n" +
    "4. overall_score = round(jumlah skor / 13). verdict: lulus >= 85, perlu_revisi 60-84, gagal < 60.\n" +
    "5. violations harus berisi string fix_instruction dari SEMUA poin yang gagal (gabungan list, bukan nested).\n" +
    "6. critique_notes (alias summary) 2-3 kalimat saja, padat dan langsung ke inti kelemahan.\n" +
    "7. Jangan menulis ulang artikel di sini, hanya menilai."
  );
}

/** Schema JSON AioCritiqueOutput sebagai string untuk disisipkan ke prompt. */
function critiqueJsonSchema(): string {
  return (
    "{\n" +
    "  // Wrapper ringkas untuk klien:\n" +
    "  \"is_passed\": <true jika verdict === 'lulus', false jika tidak>,\n" +
    "  \"qa_score\": <0-100, alias overall_score>,\n" +
    "  \"violations\": [\"<fix_instruction dari SEMUA poin yang gagal>\"],\n" +
    "  \"critique_notes\": \"<2-3 kalimat ringkasan>\",\n" +
    "\n" +
    "  // Detail untuk Prompt 5 dan audit:\n" +
    "  \"overall_score\": <0-100>,\n" +
    "  \"verdict\": \"<lulus | perlu_revisi | gagal>\",\n" +
    "  \"summary\": \"<alias critique_notes>\",\n" +
    "  \"criteria\": [\n" +
    "    {\n" +
    "      \"id\": 1,\n" +
    "      \"name\": \"TL;DR dengan 3 bullet\",\n" +
    "      \"score\": <0 atau 100>,\n" +
    "      \"status\": \"<lulus | gagal | tidak_bisa_dinilai>\",\n" +
    "      \"evidence\": \"<kutipan 5-20 kata atau '(tidak ditemukan)'>\",\n" +
    "      \"issue\": \"<kalimat diagnosis>\",\n" +
    "      \"fix_instruction\": \"<instruksi konkret untuk Prompt 5, atau null jika lulus>\"\n" +
    "    }\n" +
    "    // ... ulangi untuk id 2 sampai 13 dengan name sesuai pedoman\n" +
    "  ],\n" +
    "  \"global_issues\": [\"<masalah lintas-kriteria, misal keyword density 3.2%>\"],\n" +
    "  \"rewrite_targets\": [\n" +
    "    {\n" +
    "      \"block_index\": <1-10>,\n" +
    "      \"h2\": \"<H2 blok yang perlu ditulis ulang, atau null>\",\n" +
    "      \"reason\": \"<alasan>\",\n" +
    "      \"priority\": \"<tinggi | sedang | rendah>\"\n" +
    "    }\n" +
    "  ]\n" +
    "}"
  );
}

/** Pedoman detail 13 Poin Quality Gate yang dijabarkan ke model. */
function qg13DetailGuide(input: AioInput): string {
  return (
    "1. TL;DR dengan 3 bullet\n" +
    "   - Lulus: section eksplisit (heading 'TL;DR', 'Ringkasan', atau 'Kesimpulan Singkat') berisi tepat 3 bullet, total 40-80 kata, ada angka/persentase.\n" +
    "   - Gagal: tidak ada section ringkasan, jumlah bullet != 3, atau tidak ada angka.\n\n" +
    "2. Paragraf definisi 40-60 kata\n" +
    "   - Lulus: ada 1 paragraf jawaban 'apa itu X' dengan panjang 40-60 kata di section Definisi/What is.\n" +
    "   - Gagal: tidak ada paragraf definisi eksplisit, atau panjang < 40 atau > 60 kata.\n\n" +
    "3. Tabel perbandingan\n" +
    "   - Lulus: minimal 1 tabel Markdown/HTML dengan header baris, minimal 3 kolom dan 3 baris data, membandingkan opsi/entitas.\n" +
    "   - Gagal: tidak ada tabel, atau tabel dekoratif tanpa perbandingan, atau jumlah kolom/baris kurang.\n\n" +
    "4. Ordered list langkah\n" +
    "   - Lulus: minimal 1 ordered list bernomor (1. 2. 3.) dengan minimal 4 langkah, tiap langkah verifiable.\n" +
    "   - Gagal: tidak ada ordered list, atau jumlah langkah < 4, atau langkah terlalu vague ('pelajari', 'pahami').\n\n" +
    "5. Minimal 5 FAQ + JSON-LD\n" +
    "   - Lulus: section FAQ berisi 5-7 Q&A eksplisit, format jelas (Q: ... A: ... atau '### P: ...').\n" +
    "   - Gagal: FAQ < 5, atau FAQ tidak ada, atau format tidak jelas.\n\n" +
    "6. Direct answer 40-60 kata di tiap H2\n" +
    "   - Lulus: untuk SETIAP section H2, paragraf pertama adalah direct answer 40-60 kata, kalimat deklaratif, tidak awalan 'pendahuluan', 'sebelum kita', 'pada artikel ini', 'tidak bisa dipungkiri', 'seiring perkembangan'.\n" +
    "   - Gagal: ada H2 tanpa direct answer, atau paragraf pertama > 60 kata, atau pembuka klise.\n\n" +
    "7. Total 1.200-2.000 kata\n" +
    "   - Lulus: total kata (setelah strip tag HTML/markdown) dalam rentang 1.200-2.000.\n" +
    "   - Gagal: < 1.200 atau > 2.000 kata.\n\n" +
    (input.noExternalLinks
      ? "8. Internal 3-5 link (mode tanpa external link)\n" +
        "   - Internal: lulus jika 3-5 link Markdown ke base URL, anchor deskriptif.\n" +
        "   - External: TIDAK BERLAKU — mode ini melarang external link. Poin external OTOMATIS LULUS; jangan nilai ketiadaan external link sebagai gagal.\n" +
        "   - Gagal: jumlah internal link di luar rentang 3-5, atau anchor generic ('klik di sini', 'baca selengkapnya').\n\n"
      : "8. Internal 3-5 + External 1-3 link otoritatif\n" +
        "   - Internal: lulus jika 3-5 link Markdown ke base URL, anchor deskriptif.\n" +
        "   - External: lulus jika 1-3 link Markdown ke domain dari allowedExternalDomains, anchor deskriptif, URL aktif.\n" +
        "   - Gagal: jumlah di luar rentang, anchor generic ('klik di sini', 'baca selengkapnya'), domain tidak otoritatif.\n\n") +
    "9. Struktur heading valid (H1/H2/H3 konsisten, level tidak lonjong)\n" +
    "   - Lulus: ada H1 tepat 1, H2 untuk section utama, H3 untuk sub-section, tidak ada loncat level (H2 -> H4).\n" +
    "   - Gagal: ada multiple H1, atau level heading lonjong, atau heading generik ('Pendahuluan', 'Kesimpulan') tanpa isi.\n\n" +
    "10. Author bio + tanggal publish + last updated\n" +
    "    - Lulus: ada byline author (nama + bio singkat atau link profil), ada tanggal publish dan last updated dalam format ISO 8601 atau natural Indonesia ('18 Juni 2026').\n" +
    "    - Gagal: tidak ada author, atau tidak ada tanggal, atau tanggal tidak konsisten.\n\n" +
    `11. Recency marker muncul\n` +
    `    - Lulus: '${input.recencyMarker || input.publishDate.slice(0, 4)}' muncul minimal 1x di artikel, di posisi natural.\n` +
    `    - Gagal: recency marker tidak ada, atau muncul dengan konteks yang dipaksakan.\n\n` +
    "12. Tidak ada paragraf > 120 kata\n" +
    "    - Lulus: tidak ada paragraf (dipisah baris kosong) yang > 120 kata.\n" +
    "    - Gagal: ada minimal 1 paragraf > 120 kata.\n\n" +
    "13. Klaim numerik bersumber\n" +
    "    - Lulus: setiap angka/persentase/klaim data spesifik diikuti sebutan sumber (nama jurnal, situs, tahun, 'menurut', 'berdasarkan data').\n" +
    "    - Gagal: ada klaim numerik tanpa sumber, atau sumber tidak kredibel."
  );
}

// ============================================================================
// 3c. Tipe Output Tambahan (Prompt 5: Refinement)
// ============================================================================

/** 1 blok yang sudah direvisi oleh Prompt 5. */
export interface AioRefinedBlock {
  block_index: number;              // 1-10
  h2: string | null;
  criteria_fixed: number[];         // id poin 1-13 yang diperbaiki
  content_markdown: string;
  stats: AioBlockStats;             // reuse interface dari Prompt 3
  diff_summary: string;             // 1-2 kalimat ringkasan perubahan
}

/**
 * Output Prompt 5 - hasil targeted rewrite dari blok yang gagal Quality Gate.
 * - `refined_markdown` adalah artikel utuh yang sudah digabung: blok yang
 *   direvisi + blok dari `unchanged_blocks` (diambil dari artikel asli).
 * - `refinement_applied` false jika tidak ada blok yang perlu direvisi
 *   (short-circuit, artikel v1 langsung dipakai).
 */
export interface AioRefinementOutput {
  // Wrapper ringkas untuk klien / dashboard.
  refined_markdown: string;         // fullMarkdown setelah perbaikan
  is_refined: boolean;              // true jika ada blok yang direvisi
  changed_blocks: number[];         // daftar block_index yang berubah
  refinement_notes: string;         // 1-2 kalimat catatan editor

  // Field detail untuk audit dan iterasi.
  revised_blocks: AioRefinedBlock[];
  unchanged_blocks: number[];       // block_index 1-10 yang tidak direvisi
  global_fixes_applied: string[];   // daftar fix lintas-blok
  post_revision_notes: string[];    // hal yang masih perlu dicek manual
  expected_new_score: number;       // 0-100, estimasi skor setelah revisi
}

// ============================================================================
// 10. Prompt 5: buildRefinementPrompt (Targeted Rewrite)
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 5 (Refinement).
 *
 * Karakteristik:
 * - Wajib menerima `args.fullArticleMarkdown` (artikel v1 dari Prompt 3).
 * - Wajib menerima `args.outline` (AioOutlineOutput) untuk koherensi heading.
 * - Wajib menerima `args.critique` (AioCritiqueOutput) sebagai kompas perbaikan.
 * - Wajib menerima `args.rewriteTargets` (AioRewriteTarget[]) - subset
 *   dari critique.rewrite_targets yang sudah diurutkan priority.
 * - Wajib menerima `args.brief` (AioBriefOutput) supaya entity/facts
 *   tidak keluar jalur saat revisi.
 * - Output diharapkan JSON valid sesuai AioRefinementOutput.
 * - Temperature medium (0.5) untuk revisi yang natural, bukan formulaik.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan builder sebelumnya).
 */
export function buildRefinementPrompt(args: AioBuildArgs): AioPrompt {
  const {
    input, caps, outline, brief,
    fullArticleMarkdown, critique, rewriteTargets,
  } = args;

  if (!fullArticleMarkdown || fullArticleMarkdown.trim().length < 100) {
    throw new Error(
      "buildRefinementPrompt: args.fullArticleMarkdown wajib diisi dan minimal 100 karakter.",
    );
  }
  if (!outline) {
    throw new Error(
      "buildRefinementPrompt: args.outline wajib diisi untuk koherensi heading.",
    );
  }
  if (!critique) {
    throw new Error(
      "buildRefinementPrompt: args.critique wajib diisi. Jalankan buildCritiquePrompt + parser dulu.",
    );
  }
  if (!Array.isArray(rewriteTargets)) {
    throw new Error(
      "buildRefinementPrompt: args.rewriteTargets wajib diisi (array AioRewriteTarget). Ambil dari critique.rewrite_targets.",
    );
  }
  if (!brief) {
    throw new Error(
      "buildRefinementPrompt: args.brief wajib diisi supaya entity/facts tidak keluar jalur saat revisi.",
    );
  }

  const basePrompt: AioPrompt = {
    system: buildRefinementSystemPrompt(input),
    user: buildRefinementUserPrompt(input, outline, brief, fullArticleMarkdown, critique, rewriteTargets),
    requestParams: {
      maxTokens: 4000,
      temperature: 0.5,
    },
    expectedOutput: { kind: "json", schema: "AioRefinementOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 5 ----------

function buildRefinementSystemPrompt(input: AioInput): string {
  const brandVoice = input.brandVoice || "profesional, jelas, dan mudah dipahami";
  const brandLine = input.brandName ? ` untuk brand ${input.brandName}` : "";

  return (
    "PERAN:\n" +
    "Kamu adalah senior SEO writer + editor. " +
    "Tugasmu adalah menulis ulang HANYA blok artikel yang gagal Quality Gate. " +
    "Blok yang lulus TIDAK boleh disentuh.\n\n" +
    `KONTEKS PENULISAN${brandLine}:\n` +
    `- Brand: ${input.brandName}\n` +
    `- Audiens: ${input.targetAudience}\n` +
    `- Geo: ${input.geo}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Brand voice: ${brandVoice}\n` +
    `- Nada: ${input.tone}\n` +
    `- POV: ${input.pov}\n` +
    `- Keterbacaan: ${input.readability}\n` +
    (input.recencyMarker ? `- Recency marker: ${input.recencyMarker}\n` : "") +
    (input.internalLinkBaseUrl ? `- Base URL internal link: ${input.internalLinkBaseUrl}\n` : "") +
    "\n" +
    "PRINSIP PERBAIKAN:\n" +
    "- Minimal invasive: ubah seminimal mungkin, jangan membongkar struktur.\n" +
    "- Pertahankan direct_answer, FAQ, daftar, tabel, dan link yang sudah lulus.\n" +
    "- Jangan menambah klaim baru yang belum ada sumbernya.\n" +
    "- Jangan menghapus recency marker jika sudah ada.\n" +
    "- Pertahankan keyword di lokasi yang lolos Poin 6 (Direct Answer).\n" +
    "- Bahasa: " + input.language + ".\n\n" +
    "GAYA TULIS:\n" +
    "- Kalimat deklaratif, subjek-predikat-objek jelas.\n" +
    "- Hindari kata: mungkin, biasanya, sebaiknya, Anda bisa, kita bisa.\n" +
    "- Paragraf 1 ide utama, maksimal 120 kata.\n" +
    "- Langsung ke jawaban, tidak ada basa-basi pembuka."
  );
}

function buildRefinementUserPrompt(
  input: AioInput,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
  fullArticleMarkdown: string,
  critique: AioCritiqueOutput,
  rewriteTargets: AioRewriteTarget[],
): string {
  // Sort target by priority (tinggi -> sedang -> rendah), lalu by block_index.
  const priorityOrder: Record<AioRewritePriority, number> = { tinggi: 0, sedang: 1, rendah: 2 };
  const sortedTargets = [...rewriteTargets]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.block_index - b.block_index);

  // Brief ringkas untuk koherensi.
  const briefInline = JSON.stringify(
    {
      primary_keyword: brief.primary_keyword,
      main_entity: brief.main_entity.name,
      related_entities: brief.main_entity.related_entities,
      must_include_facts: brief.must_include_facts,
      must_avoid: brief.must_avoid,
      unique_value_angle: brief.unique_value_angle,
    },
    null,
    0,
  );

  // Critique ringkas agar model fokus pada poin yang gagal.
  const critiqueCompact = JSON.stringify(
    {
      overall_score: critique.overall_score,
      verdict: critique.verdict,
      summary: critique.summary,
      failed_criteria: critique.criteria
        .filter((c) => c.status === "gagal")
        .map((c) => ({ id: c.id, name: c.name, issue: c.issue, fix_instruction: c.fix_instruction })),
      global_issues: critique.global_issues,
    },
    null,
    0,
  );

  // Targets terurut + ringkasan fix_instruction per target untuk prompt.
  const targetsSummary = sortedTargets.map((t) => {
    const fixes = critique.criteria
      .filter((c) => c.status === "gagal" && c.fix_instruction)
      .filter((c) => inferCriterionMatchesBlock(c, t.block_index, outline));
    return {
      block_index: t.block_index,
      h2: t.h2,
      reason: t.reason,
      priority: t.priority,
      fix_instructions: fixes.map((c) => `[Poin ${c.id}] ${c.fix_instruction}`),
    };
  });

  // Outline ringkas untuk referensi saat revisi.
  const outlineInline = JSON.stringify(
    {
      title: outline.title,
      outline: outline.outline.map((b) => ({ block: b.block, name: b.name, h2: b.h2, target_words: b.target_words, direct_answer: b.direct_answer })),
      recency_marker_target: outline.recency_marker_target,
    },
    null,
    0,
  );

  return (
    "INSTRUKSI:\n" +
    "Perbaiki artikel SEO di bawah ini dengan cara menulis ulang HANYA blok-blok yang tercantum di REWRITE_TARGETS. " +
    "Blok lain TIDAK boleh diubah. Hasil akhir: refined_markdown (gabungan revised + unchanged).\n\n" +
    "DATA KONTEKS:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    (input.secondaryKeywords && input.secondaryKeywords.length ? `- Keyword sekunder: ${input.secondaryKeywords.join(", ")}\n` : "") +
    `- Brand: ${input.brandName}\n` +
    `- Judul H1: ${outline.title}\n` +
    `- Tanggal publish: ${input.publishDate}\n` +
    `- Recency marker: ${input.recencyMarker || input.publishDate.slice(0, 4)}\n` +
    `- Brand voice: ${input.brandVoice || "-"}\n` +
    `- Nada: ${input.tone} | POV: ${input.pov} | Keterbacaan: ${input.readability}\n` +
    (input.internalLinkBaseUrl ? `- Base URL internal link: ${input.internalLinkBaseUrl}\n` : "") +
    "\n" +
    "BRIEF (supaya entity & fakta tidak keluar jalur):\n" +
    briefInline +
    "\n\n" +
    "OUTLINE ASLI (supaya koherensi tidak hilang):\n" +
    outlineInline +
    "\n\n" +
    "HASIL SELF-CRITIQUE (JSON ringkas):\n" +
    critiqueCompact +
    "\n\n" +
    "REWRITE_TARGETS (urut priority tinggi -> sedang -> rendah, lalu block_index):\n" +
    JSON.stringify(targetsSummary, null, 0) +
    "\n\n" +
    "ARTIKEL LENGKAP (Markdown, kondisi SEBELUM revisi):\n" +
    fullArticleMarkdown +
    "\n\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID, tanpa teks di luar JSON):\n" +
    refinementJsonSchema() +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid sesuai schema, tanpa markdown code fence.\n" +
    "2. revised_blocks hanya berisi blok yang ada di REWRITE_TARGETS. Jangan tulis ulang blok yang tidak diminta.\n" +
    "3. unchanged_blocks berisi SEMUA block_index 1-10 yang TIDAK ada di revised_blocks.\n" +
    "4. refined_markdown = gabungkan revised_blocks (h2 + content_markdown) + unchanged_blocks (diambil dari artikel asli dengan urutan 1-10).\n" +
    "5. Setiap revised_block WAJIB menyebutkan criteria_fixed (id poin 1-13 yang diperbaiki).\n" +
    "6. Jangan menghapus/mengubah FAQ di blok 7 kecuali ada fix_instruction eksplisit untuk itu.\n" +
    "7. Jangan menghapus/mengubah sumber di blok 10 kecuali ada fix_instruction eksplisit.\n" +
    "8. Jangan menulis ulang H1. H1 hanya di artikel akhir, bukan di content_markdown blok.\n" +
    "9. Jangan menulis catatan, prompt reflection, atau komentar di luar JSON.\n" +
    "10. Jika ada konflik antara fix_instruction dan outline, fix_instruction dari Critique yang MENANG (lebih baru dan spesifik).\n" +
    "11. Jika blok sulit diperbaiki tanpa membongkar blok lain, catat di post_revision_notes agar editor manusia cek.\n" +
    "12. Bahasa: " + input.language + ". Konsisten dengan artikel asli."
  );
}

/** Schema JSON AioRefinementOutput sebagai string untuk disisipkan ke prompt. */
function refinementJsonSchema(): string {
  return (
    "{\n" +
    "  // Wrapper ringkas untuk klien / dashboard:\n" +
    "  \"refined_markdown\": \"<fullMarkdown setelah perbaikan, gabungan revised + unchanged, urut 1-10>\",\n" +
    "  \"is_refined\": <true jika revised_blocks.length > 0, false jika tidak ada yang perlu direvisi>,\n" +
    "  \"changed_blocks\": [<block_index yang direvisi>],\n" +
    "  \"refinement_notes\": \"<1-2 kalimat catatan editor>\",\n" +
    "\n" +
    "  // Detail untuk audit dan iterasi:\n" +
    "  \"revised_blocks\": [\n" +
    "    {\n" +
    "      \"block_index\": <1-10>,\n" +
    "      \"h2\": \"<H2 blok yang direvisi, atau null>\",\n" +
    "      \"criteria_fixed\": [<id poin 1-13 yang diperbaiki>],\n" +
    "      \"content_markdown\": \"<isi blok baru dalam Markdown, WAJIB memperbaiki semua fix_instruction di targets>\",\n" +
    "      \"stats\": {\n" +
    "        \"word_count\": <jumlah kata>,\n" +
    "        \"has_direct_answer\": <true | false>,\n" +
    "        \"has_table\": <true | false>,\n" +
    "        \"has_ordered_list\": <true | false>,\n" +
    "        \"internal_links_used\": [\"<anchor>\"],\n" +
    "        \"external_links_used\": [\"<anchor>\"],\n" +
    "        \"entities_mentioned\": [\"<entity>\"],\n" +
    "        \"recency_marker_present\": <true | false>\n" +
    "      },\n" +
    "      \"diff_summary\": \"<1-2 kalimat ringkasan perubahan>\"\n" +
    "    }\n" +
    "  ],\n" +
    "  \"unchanged_blocks\": [<block_index 1-10 yang tidak direvisi>],\n" +
    "  \"global_fixes_applied\": [\"<misal: 'Tambah 1 paragraf definisi 50 kata di blok 2'>\"],\n" +
    "  \"post_revision_notes\": [\"<hal yang masih perlu dicek manual, misal external link perlu verifikasi>\",\n" +
    "  \"expected_new_score\": <0-100, estimasi skor setelah revisi>\n" +
    "}"
  );
}

/**
 * Inferensi sederhana: apakah fix_instruction untuk criterion `c` kemungkinan
 * besar relevan dengan block_index tertentu. Dipakai untuk menyusun
 * targetsSummary yang lebih akurat. Tidak sempurna, hanya heuristic.
 */
function inferCriterionMatchesBlock(
  c: AioCriterion,
  blockIndex: number,
  outline: AioOutlineOutput,
): boolean {
  const blockName = outline.outline[blockIndex - 1]?.name || "";
  const instruction = (c.fix_instruction || "").toLowerCase();

  // Poin 1 (TL;DR) hanya relevan untuk blok 1.
  if (c.id === 1) return blockIndex === 1;
  // Poin 5 (FAQ) hanya relevan untuk blok 7.
  if (c.id === 5) return blockIndex === 7;
  // Poin 2 (definisi) relevan untuk blok 2.
  if (c.id === 2) return blockIndex === 2;
  // Poin 3 (tabel) relevan untuk blok 5.
  if (c.id === 3) return blockIndex === 5;
  // Poin 4 (ordered list) relevan untuk blok 6.
  if (c.id === 4) return blockIndex === 6;
  // Poin 10 (sources) hanya relevan untuk blok 10.
  if (c.id === 10) return blockIndex === 10;

  // Untuk poin lain, cek apakah nama blok atau nomor blok disebut eksplisit.
  if (instruction.includes(`blok ${blockIndex}`) || instruction.includes(`blok#${blockIndex}`)) {
    return true;
  }
  if (blockName && instruction.includes(blockName.toLowerCase().split(" ")[0])) {
    return true;
  }

  // Default: anggap relevan untuk semua blok yang gagal. Caller akan filter lagi.
  return true;
}

// ============================================================================
// 3d. Tipe Output Tambahan (Prompt 6 & 7: Schema + Meta)
// ============================================================================

/**
 * 1 elemen JSON-LD siap-suntik ke <head> artikel. String sudah di-serialize
 * valid (no trailing comma, escaped quotes). Caller tinggal `<script
 * type="application/ld+json">{json_ld_string}</script>`.
 */
export interface AioSchemaItem {
  type: "Article" | "FAQPage" | "HowTo" | "BreadcrumbList";
  json_ld_string: string;          // JSON valid hasil serialize
}

/**
 * Output Prompt 6 - 4 JSON-LD schema untuk AI Overview.
 * - `article` selalu ada.
 * - `faq` selalu ada.
 * - `howto` opsional (null jika artikel bukan how-to).
 * - `breadcrumb` selalu ada (posisi artikel dalam cluster).
 * - `validation` merangkum hasil validasi ringan sisi server.
 */
export interface AioSchemaOutput {
  article: AioSchemaItem;
  faq: AioSchemaItem;
  howto: AioSchemaItem | null;
  breadcrumb: AioSchemaItem;
  validation: {
    article_valid: boolean;
    faq_valid: boolean;
    howto_valid: boolean | null;     // null jika howto null
    breadcrumb_valid: boolean;
  };
  schema_block_html: string;         // blok <script>...</script> siap tempel
}

/**
 * Output Prompt 7 - metadata artikel + OG + Twitter + canonical.
 * Field ringkas `title` + `meta_description` + `slug` adalah wrapper yang
 * diminta klien; field detail dipakai untuk preview di editor dan audit.
 */
export interface AioMetaOutput {
  // Wrapper ringkas untuk klien / dashboard.
  title: string;                     // <= 60 char, mengandung keyword
  meta_description: string;          // 130-155 char
  slug: string;                      // 3-5 kata, lowercase + hubung

  // Field detail untuk OG, Twitter, canonical, dan audit.
  og_title: string;                  // <= 95 char
  og_description: string;            // <= 200 char
  twitter_title: string;             // <= 70 char
  twitter_description: string;       // <= 200 char
  canonical_url: string | null;
  focus_keyword: string;
  validation: {
    title_length_ok: boolean;        // <= 60 char
    meta_length_ok: boolean;         // 130-155 char
    slug_format_ok: boolean;         // 3-5 kata, lowercase + hubung
    keyword_in_title: boolean;
    keyword_in_meta: boolean;
  };
}

// ============================================================================
// 11. Prompt 6: buildSchemaPrompt (JSON-LD Generator)
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 6 (JSON-LD Generator).
 *
 * Karakteristik:
 * - Wajib menerima `args.fullArticleMarkdown` (artikel final dari Prompt 3/5).
 * - Wajib menerima `args.outline` (AioOutlineOutput) untuk FAQ, HowTo steps,
 *   dan breadcrumb posisi cluster.
 * - Wajib menerima `args.brief` (AioBriefOutput) untuk entity name + author.
 * - Output diharapkan JSON valid sesuai AioSchemaOutput (4 schema: Article,
 *   FAQPage, HowTo/BreadcrumbList). HowTo null jika bukan how-to.
 * - Temperature sangat rendah (0.1) supaya schema stabil dan valid.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan builder sebelumnya).
 */
export function buildSchemaPrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps, outline, brief, fullArticleMarkdown } = args;

  if (!fullArticleMarkdown || fullArticleMarkdown.trim().length < 100) {
    throw new Error(
      "buildSchemaPrompt: args.fullArticleMarkdown wajib diisi dan minimal 100 karakter.",
    );
  }
  if (!outline) {
    throw new Error(
      "buildSchemaPrompt: args.outline wajib diisi untuk FAQ, HowTo, dan breadcrumb.",
    );
  }
  if (!brief) {
    throw new Error(
      "buildSchemaPrompt: args.brief wajib diisi untuk entity name dan author.",
    );
  }

  const basePrompt: AioPrompt = {
    system: buildSchemaSystemPrompt(input),
    user: buildSchemaUserPrompt(input, outline, brief, fullArticleMarkdown),
    requestParams: {
      maxTokens: 3000,
      temperature: 0.1,
    },
    expectedOutput: { kind: "json", schema: "AioSchemaOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 6 ----------

function buildSchemaSystemPrompt(input: AioInput): string {
  return (
    "PERAN:\n" +
    "Kamu adalah technical SEO specialist yang menghasilkan JSON-LD schema markup untuk Google Rich Results dan AI Overviews. " +
    "Kamu menghasilkan 4 schema sekaligus: Article, FAQPage, HowTo (jika how-to), BreadcrumbList.\n\n" +
    "KONTEKS:\n" +
    `- Brand: ${input.brandName}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Geo: ${input.geo}\n` +
    `- Tanggal publish: ${input.publishDate}\n` +
    (input.authorName ? `- Penulis: ${input.authorName}\n` : "") +
    (input.authorBio ? `- Bio penulis: ${input.authorBio}\n` : "") +
    (input.lastUpdated ? `- Last updated: ${input.lastUpdated}\n` : "") +
    (input.internalLinkBaseUrl ? `- Base URL: ${input.internalLinkBaseUrl}\n` : "") +
    "\n" +
    "ATURAN SCHEMA.ORG:\n" +
    "- Setiap schema HARUS valid schema.org. Required property WAJIB diisi.\n" +
    "- Article: headline, author (Person), datePublished, dateModified, image, publisher (Organization dengan logo).\n" +
    "- FAQPage: mainEntity = array Question, tiap Question punya name (pertanyaan) + acceptedAnswer (Answer dengan text).\n" +
    "- HowTo: name, step[] (HowToStep dengan position, name, text), totalTime opsional, tool[] opsional.\n" +
    "- BreadcrumbList: itemListElement = array ListItem dengan position, name, item.\n" +
    "- Semua string di-escape dengan benar (backslash + quote, newline jadi \\n).\n" +
    "- Tidak boleh ada trailing comma.\n" +
    "- Tidak ada komentar dalam JSON.\n\n" +
    "LARANGAN:\n" +
    "- Jangan wrap output di markdown code fence (```json).\n" +
    "- Jangan tambah komentar atau penjelasan di luar JSON.\n" +
    "- Jangan tulis ulang artikel di sini, hanya schema.\n" +
    "- Jangan tambahkan field di luar schema (no @context versi lain, no extra properties)."
  );
}

function buildSchemaUserPrompt(
  input: AioInput,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
  fullArticleMarkdown: string,
): string {
  const isHowTo = (input.articleType || "").toLowerCase().includes("how-to") ||
    (input.articleType || "").toLowerCase().includes("panduan");
  const howtoLine = isHowTo
    ? "Khusus how-to: HowTo WAJIB ada (bukan null). Ekstrak langkah dari blok Step-by-step Guide (blok #6)."
    : "HowTo WAJIB null karena artikel ini bukan how-to. Cukup 3 schema: Article, FAQPage, BreadcrumbList.";

  // Ringkas data untuk hemat token.
  const briefInline = JSON.stringify(
    {
      main_entity: brief.main_entity.name,
      primary_keyword: brief.primary_keyword,
    },
    null,
    0,
  );

  const outlineInline = JSON.stringify(
    {
      title: outline.title,
      meta_description: outline.meta_description,
      slug: outline.slug,
      faq_questions: outline.faq_questions,
      internal_link_plan: outline.internal_link_plan,
      outline_blocks: outline.outline.map((b) => ({ block: b.block, name: b.name, h2: b.h2 })),
    },
    null,
    0,
  );

  return (
    "INSTRUKSI:\n" +
    "Hasilkan 4 JSON-LD schema untuk artikel SEO ini: Article, FAQPage, HowTo (atau null), BreadcrumbList. " +
    "Output HARUS JSON valid sesuai schema di bawah.\n\n" +
    "DATA ARTIKEL:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    `- Judul H1: ${outline.title}\n` +
    `- Slug: ${outline.slug}\n` +
    `- Meta description: ${outline.meta_description}\n` +
    `- Tipe artikel: ${input.articleType} (how-to: ${isHowTo ? "ya" : "tidak"})\n` +
    `- Brand: ${input.brandName}\n` +
    (input.authorName ? `- Penulis: ${input.authorName}\n` : "- Penulis: (tidak ada, pakai brand sebagai author)") +
    `- Tanggal publish: ${input.publishDate}\n` +
    `- Last updated: ${input.lastUpdated || input.publishDate}\n` +
    (input.internalLinkBaseUrl ? `- Base URL: ${input.internalLinkBaseUrl}\n` : "- Base URL: (tidak ada)") +
    "\n" +
    "BRIEF (ringkas):\n" +
    briefInline +
    "\n\n" +
    "OUTLINE (untuk FAQ dan breadcrumb):\n" +
    outlineInline +
    "\n\n" +
    `ATURAN HOWTO:\n${howtoLine}\n\n` +
    "ARTIKEL LENGKAP (Markdown - sumber ekstrak H2, FAQ, langkah, breadcrumb):\n" +
    fullArticleMarkdown +
    "\n\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID):\n" +
    schemaJsonSchema() +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid sesuai schema, tanpa markdown code fence.\n" +
    "2. Setiap json_ld_string HARUS JSON valid hasil serialize (caller akan validasi dengan JSON.parse).\n" +
    "3. Bagaimana cara menyusun schema_block_html: gabungkan semua json_ld_string dalam tag <script type=\"application/ld+json\">...</script> dengan newline di antara. field schema_block_html berisi string final.\n" +
    "4. validation: article_valid/ faq_valid/ breadcrumb_valid true jika JSON.parse() dari json_ld_string berhasil dan ada @context + @type. howto_valid null jika howto null.\n" +
    "5. Untuk HowTo: position mulai dari 1, increment 1 per langkah. Name = judul langkah, text = deskripsi singkat.\n" +
    "6. Untuk BreadcrumbList: posisi 1 = Home, posisi 2 = cluster topik, posisi 3 = artikel ini.\n" +
    "7. Untuk FAQPage: hanya pertanyaan yang jawabannya eksplisit di artikel, jangan tambahkan fiktif.\n" +
    "8. Author di Article: Person dengan name, url (opsional), dan sameAs (opsional array social URL).\n" +
    "9. Publisher di Article: Organization dengan name, logo (URL gambar 60x60 atau lebih besar).\n" +
    "10. image di Article: URL gambar featured, kalau tidak ada pakai placeholder " + (input.internalLinkBaseUrl || "https://example.com") + "/og-default.jpg."
  );
}

/** Schema JSON AioSchemaOutput sebagai string untuk disisipkan ke prompt. */
function schemaJsonSchema(): string {
  return (
    "{\n" +
    "  \"article\": {\n" +
    "    \"type\": \"Article\",\n" +
    "    \"json_ld_string\": \"<string JSON valid, escape quote dan newline>\"\n" +
    "  },\n" +
    "  \"faq\": {\n" +
    "    \"type\": \"FAQPage\",\n" +
    "    \"json_ld_string\": \"<string JSON valid>\"\n" +
    "  },\n" +
    "  \"howto\": { \"type\": \"HowTo\", \"json_ld_string\": \"<string JSON valid>\" } | null,\n" +
    "  \"breadcrumb\": {\n" +
    "    \"type\": \"BreadcrumbList\",\n" +
    "    \"json_ld_string\": \"<string JSON valid>\"\n" +
    "  },\n" +
    "  \"validation\": {\n" +
    "    \"article_valid\": <true | false>,\n" +
    "    \"faq_valid\": <true | false>,\n" +
    "    \"howto_valid\": <true | false | null>,\n" +
    "    \"breadcrumb_valid\": <true | false>\n" +
    "  },\n" +
    "  \"schema_block_html\": \"<gabungan semua json_ld_string dalam tag <script type='application/ld+json'>...</script> dengan newline di antara, siap tempel ke <head> artikel>\"\n" +
    "}"
  );
}

// ============================================================================
// 12. Prompt 7: buildMetaPrompt (Title, Slug, Meta, OG, Twitter)
// ============================================================================

/**
 * Membangun system + user prompt untuk Prompt 7 (Meta Generator).
 *
 * Karakteristik:
 * - Wajib menerima `args.fullArticleMarkdown` (artikel final dari Prompt 3/5).
 * - Wajib menerima `args.outline` (AioOutlineOutput) - title/slug/meta dari
 *   outline dipakai sebagai acuan, prompt ini memolesnya.
 * - Wajib menerima `args.brief` (AioBriefOutput) untuk primary keyword + entity.
 * - Output diharapkan JSON valid sesuai AioMetaOutput.
 * - Temperature rendah (0.3) supaya meta stabil dan tidak over-creative.
 * - maxTokens kecil (800) karena output ringkas.
 *
 * Penyesuaian provider via withRequestParamsForProvider() + withProviderAdapters()
 * di akhir (pola sama dengan builder sebelumnya).
 */
export function buildMetaPrompt(args: AioBuildArgs): AioPrompt {
  const { input, caps, outline, brief, fullArticleMarkdown } = args;

  if (!fullArticleMarkdown || fullArticleMarkdown.trim().length < 100) {
    throw new Error(
      "buildMetaPrompt: args.fullArticleMarkdown wajib diisi dan minimal 100 karakter.",
    );
  }
  if (!outline) {
    throw new Error(
      "buildMetaPrompt: args.outline wajib diisi untuk referensi title/slug/meta.",
    );
  }
  if (!brief) {
    throw new Error(
      "buildMetaPrompt: args.brief wajib diisi untuk primary keyword.",
    );
  }

  const basePrompt: AioPrompt = {
    system: buildMetaSystemPrompt(input),
    user: buildMetaUserPrompt(input, outline, brief, fullArticleMarkdown),
    requestParams: {
      maxTokens: 800,
      temperature: 0.3,
    },
    expectedOutput: { kind: "json", schema: "AioMetaOutput" },
  };

  const withParams = withRequestParamsForProvider(basePrompt, caps);
  return withProviderAdapters(withParams, caps);
}

// ---------- Internal builders untuk Prompt 7 ----------

function buildMetaSystemPrompt(input: AioInput): string {
  return (
    "PERAN:\n" +
    "Kamu adalah technical SEO specialist yang memoles metadata artikel untuk hasil pencarian Google. " +
    "Tugasmu: title tag, meta description, slug, OG tags, Twitter tags, canonical URL, focus keyword.\n\n" +
    "KONTEKS:\n" +
    `- Brand: ${input.brandName}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Geo: ${input.geo}\n` +
    (input.internalLinkBaseUrl ? `- Base URL: ${input.internalLinkBaseUrl}\n` : "- Base URL: (tidak ada)") +
    "\n" +
    "ATURAN PANJANG:\n" +
    "- title: <= 60 karakter, mengandung primary keyword di awal atau tengah, ada power word atau angka.\n" +
    "- meta_description: 130-155 karakter, mengandung keyword dan call-to-value yang jelas.\n" +
    "- slug: 3-5 kata, lowercase, pisah tanda hubung (-), tanpa stopword ('dan', 'yang', 'di', 'untuk').\n" +
    "- og_title: <= 95 karakter.\n" +
    "- og_description: <= 200 karakter.\n" +
    "- twitter_title: <= 70 karakter.\n" +
    "- twitter_description: <= 200 karakter.\n" +
    "- canonical_url: gabungkan base URL + slug, atau null jika tidak ada base URL.\n" +
    "- focus_keyword: keyword utama yang menjadi target artikel.\n\n" +
    "LARANGAN:\n" +
    "- Jangan wrap output di markdown code fence (```json).\n" +
    "- Jangan tambah komentar atau penjelasan di luar JSON.\n" +
    "- Jangan tulis ulang artikel di sini, hanya metadata.\n" +
    "- Jangan pakai karakter spesial di slug (selain huruf, angka, tanda hubung)."
  );
}

function buildMetaUserPrompt(
  input: AioInput,
  outline: AioOutlineOutput,
  brief: AioBriefOutput,
  fullArticleMarkdown: string,
): string {
  const baseUrl = input.internalLinkBaseUrl || "";
  const fullUrl = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/${outline.slug}` : "";

  return (
    "INSTRUKSI:\n" +
    "Hasilkan metadata artikel SEO yang optimal. Output HARUS JSON valid sesuai schema di bawah.\n\n" +
    "DATA ARTIKEL:\n" +
    `- Keyword utama: ${input.keyword}\n` +
    `- Primary keyword (dari brief): ${brief.primary_keyword}\n` +
    `- Bahasa: ${input.language}\n` +
    `- Brand: ${input.brandName}\n` +
    `- Title outline (referensi): ${outline.title}\n` +
    `- Slug outline (referensi): ${outline.slug}\n` +
    `- Meta description outline (referensi): ${outline.meta_description}\n` +
    (fullUrl ? `- Target URL: ${fullUrl}\n` : "") +
    "\n" +
    "ARTIKEL LENGKAP (Markdown - sumber untuk memahami konteks):\n" +
    fullArticleMarkdown.slice(0, 6000) +
    "\n\n" +
    "SCHEMA OUTPUT (WAJIB JSON VALID):\n" +
    metaJsonSchema() +
    "\n" +
    "ATURAN KERAS:\n" +
    "1. Output HARUS JSON valid sesuai schema, tanpa markdown code fence.\n" +
    "2. title: <= 60 karakter, Wajib mengandung primary keyword. Jika outline.title tidak ideal, generate ulang.\n" +
    "3. meta_description: 130-155 karakter, Wajib mengandung keyword dan CTA value.\n" +
    "4. slug: 3-5 kata, lowercase + hubung, tanpa stopword. Wajib mengandung kata dari keyword utama.\n" +
    "5. og_title <= 95, og_description <= 200, twitter_title <= 70, twitter_description <= 200.\n" +
    "6. canonical_url: full URL = base_url + slug, atau null jika base_url kosong.\n" +
    "7. focus_keyword: keyword utama target (kalau multi-word, lowercase).\n" +
    "8. validation: true jika sesuai aturan, false jika tidak. Caller akan retry sekali jika title/meta/keyword gagal.\n" +
    "9. title, og_title, twitter_title BOLEH beda (OG lebih longgar, Twitter paling ringkas).\n" +
    "10. Bahasa konsisten dengan input.language."
  );
}

/** Schema JSON AioMetaOutput sebagai string untuk disisipkan ke prompt. */
function metaJsonSchema(): string {
  return (
    "{\n" +
    "  // Wrapper ringkas untuk klien / dashboard:\n" +
    "  \"title\": \"<string <= 60 karakter, mengandung primary keyword>\",\n" +
    "  \"meta_description\": \"<string 130-155 karakter, mengandung keyword dan CTA>\",\n" +
    "  \"slug\": \"<string 3-5 kata, lowercase, pisah hubung>\",\n" +
    "\n" +
    "  // Detail untuk OG, Twitter, canonical, audit:\n" +
    "  \"og_title\": \"<string <= 95 karakter>\",\n" +
    "  \"og_description\": \"<string <= 200 karakter>\",\n" +
    "  \"twitter_title\": \"<string <= 70 karakter>\",\n" +
    "  \"twitter_description\": \"<string <= 200 karakter>\",\n" +
    "  \"canonical_url\": \"<full URL base + slug, atau null jika base tidak ada>\",\n" +
    "  \"focus_keyword\": \"<primary keyword lowercase>\",\n" +
    "  \"validation\": {\n" +
    "    \"title_length_ok\": <true jika title.length <= 60>,\n" +
    "    \"meta_length_ok\": <true jika 130 <= meta_description.length <= 155>,\n" +
    "    \"slug_format_ok\": <true jika 3-5 kata, lowercase + hubung saja>,\n" +
    "    \"keyword_in_title\": <true jika primary_keyword muncul di title case-insensitive>,\n" +
    "    \"keyword_in_meta\": <true jika primary_keyword muncul di meta_description case-insensitive>\n" +
    "  }\n" +
    "}"
  );
}
