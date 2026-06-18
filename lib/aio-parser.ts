// lib/aio-parser.ts
// Parser untuk 7 output dari lib/prompt-aio.ts.
// Tujuan: membersihkan output model (Claude/DeepSeek suka wrap di ```json,
// GPT/Flash kadang tambah preamble) lalu mengembalikan objek TypeScript
// yang sesuai kontrak interface.
//
// Prinsip desain (lihat docs/aio-parser-design.md):
//   1. Defensive parsing - output model tidak pernah dipercaya 100%.
//   2. Type-safe - return type sesuai interface Aio*Output.
//   3. Stateless - pure function, tidak ada side effect.
//   4. Provider-aware - branch per AioProviderId.
//   5. Graceful degradation - fallback Markdown tetap return objek valid.
//
// Struktur file:
//   1. Tipe internal (CleaningStep, ParseAttempt, ParseStats)
//   2. Helper pembersihan teks (10 helper)
//   3. Interface AioParser<T> generic + factory createAioParser
//   4. 7 parser instance (brief, outline, block, critique, refinement, schema, meta)
//   5. Validator per output (7 type predicate)
//   6. Re-exporter untuk kemudahan import

import {
  AioProviderId,
  AioBriefOutput,
  AioOutlineOutput,
  AioOutlineBlock,
  AioBlockOutput,
  AioBlockStats,
  AioBlockName,
  AioBlockFormat,
  AioCritiqueOutput,
  AioCriterion,
  AioCriterionStatus,
  AioRewriteTarget,
  AioRefinementOutput,
  AioRefinedBlock,
  AioSchemaOutput,
  AioSchemaItem,
  AioMetaOutput,
} from "./prompt-aio";

// ============================================================================
// 1. Tipe Internal
// ============================================================================

/** Tahapan cleaning yang sudah dicoba. Untuk logging/debug. */
export interface CleaningStep {
  name: string;
  matched: boolean;
  bytesRemoved: number;
}

/** Hasil satu attempt parse. */
export interface ParseAttempt<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  steps: CleaningStep[];
  usedFallback: boolean;
}

/** Statistik parsing untuk monitoring/log. */
export interface ParseStats {
  rawBytes: number;
  cleanedBytes: number;
  attempts: number;
  totalTimeMs: number;
  providerId: AioProviderId;
}

// ============================================================================
// 2. Helper Pembersihan Teks (10 helper, pure function)
// ============================================================================

interface CleanResult { text: string; matched: boolean; bytesRemoved: number; }

/** Buang BOM, zero-width characters, non-printable whitespace. */
function sanitizeWhitespace(text: string): CleanResult {
  const before = text.length;
  // Hapus BOM (\uFEFF), zero-width space/joiner (\u200B-\u200D), dan non-printable.
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, "")
    .replace(/\r\n/g, "\n");
  const removed = before - cleaned.length;
  return { text: cleaned, matched: removed > 0, bytesRemoved: removed };
}

/** Buang markdown code fence (```json ... ``` atau ``` ... ```) di awal/akhir. */
function stripFences(text: string): CleanResult {
  const before = text.length;
  // Pola: ```json\n ... \n```  atau  ```\n ... \n```
  const fenceRegex = /^\s*```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```\s*$/;
  const match = text.match(fenceRegex);
  if (match) {
    return { text: match[1], matched: true, bytesRemoved: before - match[1].length };
  }
  // Pola longgar: ``` di awal tanpa match akhir (Claude kadang lupa tutup).
  const looseStart = text.match(/^\s*```(?:json|JSON)?\s*\n?([\s\S]*)/);
  if (looseStart) {
    return { text: looseStart[1], matched: true, bytesRemoved: before - looseStart[1].length };
  }
  return { text, matched: false, bytesRemoved: 0 };
}

/** Buang preamble basa-basi di awal: "Tentu,", "Baik,", "Berikut adalah JSON:", "Here is the JSON:", dll. */
function stripChatter(text: string): CleanResult {
  const before = text.length;
  const chatterPatterns: RegExp[] = [
    /^\s*(Tentu|Baik|Berikut(?: adalah)?|Tentu saja|Dengan senang hati|Saya akan|Ini adalah|Di bawah ini)[^\n:]*:\s*\n/i,
    /^\s*(Here is|Here''s|Sure|Certainly|Of course)[^\n:]*:\s*\n/i,
    /^\s*(Below is|The following is)[^\n:]*:\s*\n/i,
  ];
  for (const pat of chatterPatterns) {
    const m = text.match(pat);
    if (m) {
      return { text: text.slice(m[0].length), matched: true, bytesRemoved: m[0].length };
    }
  }
  return { text, matched: false, bytesRemoved: 0 };
}

/**
 * Cari blok JSON pertama yang balanced. Pakai stack-based scan karena regex naif
 * gagal untuk nested object/array. Abaikan karakter di dalam string.
 */
function extractJsonBlock(text: string): CleanResult {
  // Cari { atau [ pertama.
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  let openChar: "{" | "[" | null = null;
  let closeChar: "}" | "]" | null = null;
  if (firstBrace === -1 && firstBracket === -1) {
    return { text, matched: false, bytesRemoved: 0 };
  }
  if (firstBrace === -1) { startIdx = firstBracket; openChar = "["; closeChar = "]"; }
  else if (firstBracket === -1) { startIdx = firstBrace; openChar = "{"; closeChar = "}"; }
  else if (firstBrace < firstBracket) { startIdx = firstBrace; openChar = "{"; closeChar = "}"; }
  else { startIdx = firstBracket; openChar = "["; closeChar = "]"; }

  // Stack-based scan dari startIdx, abaikan yang di dalam string.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        const block = text.slice(startIdx, i + 1);
        const before = text.length;
        const newText = block + text.slice(i + 1).replace(/^\s+|\s+$/g, "");
        return { text: newText, matched: true, bytesRemoved: before - newText.length };
      }
    }
  }
  return { text, matched: false, bytesRemoved: 0 };
}

/** Buang trailing prose setelah JSON valid berakhir. */
function stripTrailingProse(text: string): CleanResult {
  // Cari } atau ] terakhir yang merupakan penutup JSON.
  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const lastClose = Math.max(lastBrace, lastBracket);
  if (lastClose === -1 || lastClose === text.length - 1) {
    return { text, matched: false, bytesRemoved: 0 };
  }
  const trailing = text.slice(lastClose + 1).trim();
  if (trailing.length === 0) {
    return { text: text.slice(0, lastClose + 1), matched: false, bytesRemoved: 0 };
  }
  // Pastikan trailing bukan whitespace saja.
  return {
    text: text.slice(0, lastClose + 1),
    matched: true,
    bytesRemoved: trailing.length + 1,
  };
}

/** Buang komentar inline // ... dan /* ... * / yang kadang disisipkan model. */
function stripJsonComments(text: string): CleanResult {
  const before = text.length;
  // Hapus // ... newline (abaikan jika di dalam string).
  // Hapus /* ... */ (abaikan jika di dalam string).
  let out = "";
  let i = 0;
  let inString = false;
  let escape = false;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (escape) { out += ch; escape = false; i++; continue; }
    if (ch === "\\") { out += ch; escape = true; i++; continue; }
    if (ch === '"') { inString = !inString; out += ch; i++; continue; }
    if (!inString && ch === "/" && next === "/") {
      // Skip sampai newline.
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (!inString && ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  const removed = before - out.length;
  return { text: out, matched: removed > 0, bytesRemoved: removed };
}

/** Normalisasi smart quote ke kutip lurus. */
function normalizeQuotes(text: string): CleanResult {
  const before = text.length;
  const cleaned = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, "-");
  const removed = before - cleaned.length;
  return { text: cleaned, matched: removed > 0 || text !== cleaned, bytesRemoved: removed };
}

/** Repair trailing comma sebelum } atau ]. */
function repairTrailingCommas(text: string): CleanResult {
  const before = text.length;
  // Hapus koma diikuti optional whitespace lalu } atau ].
  const cleaned = text.replace(/,(\s*[}\]])/g, "$1");
  const removed = before - cleaned.length;
  return { text: cleaned, matched: removed > 0, bytesRemoved: removed };
}

/** Decode escaped newlines/tabs yang kadang double-escape. */
function unescapeJson(text: string): CleanResult {
  const before = text.length;
  const cleaned = text
    .replace(/\\\\n/g, "\\n")
    .replace(/\\\\t/g, "\\t")
    .replace(/\\\\"/g, '\\"');
  const removed = before - cleaned.length;
  return { text: cleaned, matched: removed > 0, bytesRemoved: removed };
}

/** Brute force terakhir: cari { pertama dan } terakhir. */
function tryFirstBraceToLastBrace(text: string): CleanResult {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    return { text, matched: false, bytesRemoved: 0 };
  }
  const block = text.slice(first, last + 1);
  return { text: block, matched: true, bytesRemoved: text.length - block.length };
}

// ============================================================================
// 3. Interface AioParser<T> Generic + Factory
// ============================================================================

/** Strategy utama: JSON parsing setelah cleaning pipeline. */
export interface AioParser<T> {
  parse(rawText: string, providerId: AioProviderId): ParseAttempt<T>;
  /** Strategy fallback: parse dari markdown/heuristic kalau JSON gagal. */
  parseMarkdownFallback(rawText: string): T;
}

/** Pipeline cleaning yang dikurangi untuk provider JSON-native. */
function cleanForJsonNative(text: string, steps: CleaningStep[]): string {
  let cur = text;
  const r1 = sanitizeWhitespace(cur); cur = r1.text; steps.push({ name: "sanitizeWhitespace", ...r1 });
  const r5 = stripTrailingProse(cur); cur = r5.text; steps.push({ name: "stripTrailingProse", ...r5 });
  const r7 = normalizeQuotes(cur); cur = r7.text; steps.push({ name: "normalizeQuotes", ...r7 });
  const r8 = repairTrailingCommas(cur); cur = r8.text; steps.push({ name: "repairTrailingCommas", ...r8 });
  const r4 = extractJsonBlock(cur); cur = r4.text; steps.push({ name: "extractJsonBlock", ...r4 });
  return cur;
}

/** Pipeline cleaning penuh untuk provider non-JSON-native (Claude/DeepSeek). */
function cleanForNonJsonNative(text: string, steps: CleaningStep[]): string {
  let cur = text;
  const r1 = sanitizeWhitespace(cur); cur = r1.text; steps.push({ name: "sanitizeWhitespace", ...r1 });
  const r2 = stripFences(cur); cur = r2.text; steps.push({ name: "stripFences", ...r2 });
  const r3 = stripChatter(cur); cur = r3.text; steps.push({ name: "stripChatter", ...r3 });
  const r5 = stripTrailingProse(cur); cur = r5.text; steps.push({ name: "stripTrailingProse", ...r5 });
  const r6 = stripJsonComments(cur); cur = r6.text; steps.push({ name: "stripJsonComments", ...r6 });
  const r7 = normalizeQuotes(cur); cur = r7.text; steps.push({ name: "normalizeQuotes", ...r7 });
  const r8 = repairTrailingCommas(cur); cur = r8.text; steps.push({ name: "repairTrailingCommas", ...r8 });
  const r9 = unescapeJson(cur); cur = r9.text; steps.push({ name: "unescapeJson", ...r9 });
  const r4 = extractJsonBlock(cur); cur = r4.text; steps.push({ name: "extractJsonBlock", ...r4 });
  return cur;
}

const NON_NATIVE_PROVIDERS: ReadonlySet<AioProviderId> = new Set<AioProviderId>([
  "anthropic", "deepseek",
]);

/** Factory generic untuk membuat parser. */
export function createAioParser<T>(
  schemaName: string,
  validator: (obj: unknown) => obj is T,
  fallbackBuilder: (rawText: string) => T,
): AioParser<T> {
  return {
    parse(rawText: string, providerId: AioProviderId): ParseAttempt<T> {
      const steps: CleaningStep[] = [];
      const started = Date.now();
      try {
        const cleaned = NON_NATIVE_PROVIDERS.has(providerId)
          ? cleanForNonJsonNative(rawText, steps)
          : cleanForJsonNative(rawText, steps);
        const parsed = JSON.parse(cleaned);
        if (!validator(parsed)) {
          return {
            success: false,
            data: null,
            error: `[${schemaName}] JSON.parse berhasil tapi validator<T> menolak`,
            steps,
            usedFallback: false,
          };
        }
        return {
          success: true,
          data: parsed,
          error: null,
          steps,
          usedFallback: false,
        };
      } catch (e: unknown) {
        // Brute force fallback terakhir sebelum menyerah.
        try {
          const bfSteps: CleaningStep[] = steps.slice();
          const bf = tryFirstBraceToLastBrace(rawText);
          bfSteps.push({ name: "tryFirstBraceToLastBrace", ...bf });
          if (bf.matched) {
            const parsed = JSON.parse(bf.text);
            if (validator(parsed)) {
              return { success: true, data: parsed, error: null, steps: bfSteps, usedFallback: false };
            }
          }
        } catch { /* swallow */ }
        return {
          success: false,
          data: null,
          error: `[${schemaName}] ${e instanceof Error ? e.message : String(e)}`,
          steps,
          usedFallback: false,
        };
      } finally {
        void started; // reserved untuk ParseStats.totalTimeMs di iterasi berikutnya
      }
    },
    parseMarkdownFallback(rawText: string): T {
      return fallbackBuilder(rawText);
    },
  };
}

// ============================================================================
// 5. Validator per Output (type predicate, lightweight, tanpa Zod/Ajv)
// ============================================================================

function isString(v: unknown): v is string { return typeof v === "string"; }
function isNumber(v: unknown): v is number { return typeof v === "number" && !Number.isNaN(v); }
function isBoolean(v: unknown): v is boolean { return typeof v === "boolean"; }
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAioBriefOutput(obj: unknown): obj is AioBriefOutput {
  if (!isObject(obj)) return false;
  if (!isString(obj.primary_keyword) || obj.primary_keyword.length === 0) return false;
  if (!["informational", "commercial", "transactional"].includes(obj.search_intent as string)) return false;
  if (!["awareness", "consideration", "decision"].includes(obj.user_journey_stage as string)) return false;
  if (!isObject(obj.main_entity)) return false;
  if (!isString(obj.main_entity.name)) return false;
  if (!isStringArray(obj.main_entity.synonyms_id)) return false;
  if (!isStringArray(obj.main_entity.synonyms_en)) return false;
  if (!isStringArray(obj.main_entity.related_entities)) return false;
  if (!isObject(obj.serp_signals)) return false;
  if (!isStringArray(obj.serp_signals.top_3_patterns)) return false;
  if (!isStringArray(obj.serp_signals.common_questions) || (obj.serp_signals.common_questions as string[]).length < 5) return false;
  if (!isString(obj.serp_signals.content_gap) || (obj.serp_signals.content_gap as string).length === 0) return false;
  if (!["definition", "list", "table", "steps"].includes(obj.serp_signals.snippet_type_dominant as string)) return false;
  if (!isString(obj.unique_value_angle)) return false;
  if (!isStringArray(obj.must_include_facts) || (obj.must_include_facts as string[]).length < 3) return false;
  if (!isStringArray(obj.must_avoid)) return false;
  if (!isStringArray(obj.internal_link_opportunities)) return false;
  if (!isStringArray(obj.external_source_targets)) return false;
  if (!isString(obj.recency_window)) return false;
  return true;
}

function isAioOutlineOutput(obj: unknown): obj is AioOutlineOutput {
  if (!isObject(obj)) return false;
  if (!isString(obj.title) || obj.title.length === 0 || obj.title.length > 80) return false;
  if (!isString(obj.slug)) return false;
  if (!isString(obj.meta_description)) return false;
  if (!Array.isArray(obj.outline) || obj.outline.length !== 10) return false;
  const blocks = obj.outline as unknown[];
  for (let i = 0; i < 10; i++) {
    const b = blocks[i];
    if (!isObject(b)) return false;
    if (!isNumber(b.block) || b.block !== i + 1) return false;
    if (!isString(b.name)) return false;
    if (!(b.h2 === null || isString(b.h2))) return false;
    if (!isNumber(b.target_words) || b.target_words <= 0) return false;
    if (!isString(b.purpose)) return false;
    if (!isString(b.direct_answer)) return false;
    if (!isStringArray(b.must_include)) return false;
    if (!Array.isArray(b.format)) return false;
  }
  if (!isStringArray(obj.faq_questions) || (obj.faq_questions as string[]).length < 5) return false;
  if (!isStringArray(obj.entity_coverage_checklist)) return false;
  if (!Array.isArray(obj.internal_link_plan)) return false;
  if (!Array.isArray(obj.external_link_plan)) return false;
  if (!isString(obj.recency_marker_target)) return false;
  return true;
}

function isAioBlockOutput(obj: unknown): obj is AioBlockOutput {
  if (!isObject(obj)) return false;
  if (!isNumber(obj.block_index) || obj.block_index < 1 || obj.block_index > 10) return false;
  if (!(obj.h2 === null || isString(obj.h2))) return false;
  if (!isString(obj.content_markdown) || obj.content_markdown.length === 0) return false;
  if (!isObject(obj.stats)) return false;
  const s = obj.stats;
  if (!isNumber(s.word_count)) return false;
  if (!isBoolean(s.has_direct_answer)) return false;
  if (!isBoolean(s.has_table)) return false;
  if (!isBoolean(s.has_ordered_list)) return false;
  if (!isStringArray(s.internal_links_used)) return false;
  if (!isStringArray(s.external_links_used)) return false;
  if (!isStringArray(s.entities_mentioned)) return false;
  if (!isBoolean(s.recency_marker_present)) return false;
  return true;
}

function isAioCritiqueOutput(obj: unknown): obj is AioCritiqueOutput {
  if (!isObject(obj)) return false;
  if (!isBoolean(obj.is_passed)) return false;
  if (!isNumber(obj.qa_score) || obj.qa_score < 0 || obj.qa_score > 100) return false;
  if (!isStringArray(obj.violations)) return false;
  if (!isString(obj.critique_notes)) return false;
  if (!isNumber(obj.overall_score) || obj.overall_score < 0 || obj.overall_score > 100) return false;
  if (!["lulus", "perlu_revisi", "gagal"].includes(obj.verdict as string)) return false;
  if (!isString(obj.summary)) return false;
  if (!Array.isArray(obj.criteria) || obj.criteria.length !== 13) return false;
  for (const c of obj.criteria as unknown[]) {
    if (!isObject(c)) return false;
    if (!isNumber(c.id) || c.id < 1 || c.id > 13) return false;
    if (!isString(c.name)) return false;
    if (c.score !== 0 && c.score !== 100) return false;
    if (!["lulus", "gagal", "tidak_bisa_dinilai"].includes(c.status as string)) return false;
    if (!isString(c.evidence)) return false;
    if (!isString(c.issue)) return false;
    if (!(c.fix_instruction === null || isString(c.fix_instruction))) return false;
  }
  if (!isStringArray(obj.global_issues)) return false;
  if (!Array.isArray(obj.rewrite_targets)) return false;
  for (const t of obj.rewrite_targets as unknown[]) {
    if (!isObject(t)) return false;
    if (!isNumber(t.block_index) || t.block_index < 1 || t.block_index > 10) return false;
    if (!(t.h2 === null || isString(t.h2))) return false;
    if (!isString(t.reason)) return false;
    if (!["tinggi", "sedang", "rendah"].includes(t.priority as string)) return false;
  }
  return true;
}

function isAioRefinementOutput(obj: unknown): obj is AioRefinementOutput {
  if (!isObject(obj)) return false;
  if (!isString(obj.refined_markdown) || obj.refined_markdown.length === 0) return false;
  if (!isBoolean(obj.is_refined)) return false;
  if (!Array.isArray(obj.changed_blocks) || !obj.changed_blocks.every(isNumber)) return false;
  if (!isString(obj.refinement_notes)) return false;
  if (!Array.isArray(obj.revised_blocks)) return false;
  for (const r of obj.revised_blocks as unknown[]) {
    if (!isObject(r)) return false;
    if (!isNumber(r.block_index)) return false;
    if (!(r.h2 === null || isString(r.h2))) return false;
    if (!Array.isArray(r.criteria_fixed) || !r.criteria_fixed.every(isNumber)) return false;
    if (!isString(r.content_markdown)) return false;
    if (!isObject(r.stats)) return false;
    if (!isString(r.diff_summary)) return false;
  }
  if (!Array.isArray(obj.unchanged_blocks) || !obj.unchanged_blocks.every(isNumber)) return false;
  if (!isStringArray(obj.global_fixes_applied)) return false;
  if (!isStringArray(obj.post_revision_notes)) return false;
  if (!isNumber(obj.expected_new_score)) return false;
  return true;
}

function isAioSchemaItem(v: unknown): v is AioSchemaItem {
  if (!isObject(v)) return false;
  if (!["Article", "FAQPage", "HowTo", "BreadcrumbList"].includes(v.type as string)) return false;
  if (!isString(v.json_ld_string)) return false;
  try {
    const parsed = JSON.parse(v.json_ld_string);
    return isObject(parsed) && "@context" in parsed && "@type" in parsed;
  } catch {
    return false;
  }
}

function isAioSchemaOutput(obj: unknown): obj is AioSchemaOutput {
  if (!isObject(obj)) return false;
  if (!isAioSchemaItem(obj.article)) return false;
  if (!isAioSchemaItem(obj.faq)) return false;
  if (!(obj.howto === null || isAioSchemaItem(obj.howto))) return false;
  if (!isAioSchemaItem(obj.breadcrumb)) return false;
  if (!isObject(obj.validation)) return false;
  const v = obj.validation;
  if (!isBoolean(v.article_valid)) return false;
  if (!isBoolean(v.faq_valid)) return false;
  if (!(v.howto_valid === null || isBoolean(v.howto_valid))) return false;
  if (!isBoolean(v.breadcrumb_valid)) return false;
  if (!isString(obj.schema_block_html)) return false;
  return true;
}

function isAioMetaOutput(obj: unknown): obj is AioMetaOutput {
  if (!isObject(obj)) return false;
  if (!isString(obj.title) || obj.title.length === 0 || obj.title.length > 80) return false;
  if (!isString(obj.meta_description)) return false;
  if (!isString(obj.slug)) return false;
  if (!isString(obj.og_title)) return false;
  if (!isString(obj.og_description)) return false;
  if (!isString(obj.twitter_title)) return false;
  if (!isString(obj.twitter_description)) return false;
  if (!(obj.canonical_url === null || isString(obj.canonical_url))) return false;
  if (!isString(obj.focus_keyword)) return false;
  if (!isObject(obj.validation)) return false;
  const v = obj.validation;
  if (!isBoolean(v.title_length_ok)) return false;
  if (!isBoolean(v.meta_length_ok)) return false;
  if (!isBoolean(v.slug_format_ok)) return false;
  if (!isBoolean(v.keyword_in_title)) return false;
  if (!isBoolean(v.keyword_in_meta)) return false;
  return true;
}

// ============================================================================
// 4. 7 Parser Instance
// ============================================================================

// ---------- 4.1 briefParser ----------

const BRIEF_FALLBACK_KEYWORDS: AioBriefOutput["main_entity"]["type"][] = [
  "concept", "product", "service", "person", "place", "technology",
];

function buildBriefFallback(rawText: string): AioBriefOutput {
  // Ekstrak primary_keyword dari pola "Keyword utama: X" atau "primary_keyword: X".
  const kwMatch = rawText.match(/(?:[Kk]eyword\s+utama|primary_keyword)\s*[:=]\s*"?([^\n"]+)"?/);
  const primary = kwMatch ? kwMatch[1].trim() : (rawText.trim().split(/\s+/).slice(0, 3).join(" ") || "topik");
  return {
    primary_keyword: primary,
    search_intent: "informational",
    user_journey_stage: "awareness",
    main_entity: {
      name: primary,
      type: BRIEF_FALLBACK_KEYWORDS[0],
      synonyms_id: [],
      synonyms_en: [],
      related_entities: [],
    },
    serp_signals: {
      top_3_patterns: [],
      common_questions: [],
      snippet_type_dominant: "definition",
      content_gap: "(data tidak tersedia - pakai prompt 1 retry atau isi manual)",
    },
    unique_value_angle: "(fallback - tidak ada data)",
    must_include_facts: [],
    must_avoid: [],
    internal_link_opportunities: [],
    external_source_targets: [],
    recency_window: "2024-2026",
  };
}

export const briefParser: AioParser<AioBriefOutput> = createAioParser<AioBriefOutput>(
  "AioBriefOutput",
  isAioBriefOutput,
  buildBriefFallback,
);

// ---------- 4.2 outlineParser ----------

const BLOCK_NAMES_SOP: AioBlockName[] = [
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

function buildOutlineFallback(rawText: string): AioOutlineOutput {
  // Extract H2/H3 dari Markdown.
  const h2Regex = /^##\s+(.+)$/gm;
  const h3Regex = /^###\s+(.+)$/gm;
  const h2s: string[] = [];
  const h3s: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = h2Regex.exec(rawText))) h2s.push(m[1].trim());
  while ((m = h3Regex.exec(rawText))) h3s.push(m[1].trim());

  const totalWords = 1600;
  const perBlock = Math.round(totalWords / 10);
  const outline: AioOutlineBlock[] = BLOCK_NAMES_SOP.map((name, i) => ({
    block: i + 1,
    name,
    h2: h2s[i] || null,
    target_words: perBlock,
    purpose: `(fallback - ${name})`,
    direct_answer: `(fallback direct answer untuk ${name}, 40-60 kata akan diisi Prompt 3)`,
    must_include: [],
    format: i === 4 ? ["table" as AioBlockFormat] : i === 5 ? ["numbered" as AioBlockFormat] : ["paragraph" as AioBlockFormat],
  }));

  // FAQ dari heading "FAQ" atau "Pertanyaan Umum".
  const faqQuestions: string[] = [];
  const faqSection = rawText.match(/##\s+(?:FAQ|Pertanyaan Umum)[\s\S]*?(?=\n##\s|\n#\s|$)/i);
  if (faqSection) {
    const qRegex = /###\s+(?:P:|Q:)?\s*([^\n]+)/g;
    let qm: RegExpExecArray | null;
    while ((qm = qRegex.exec(faqSection[0]))) faqQuestions.push(qm[1].trim());
  }
  while (faqQuestions.length < 5) {
    faqQuestions.push(`(fallback FAQ ${faqQuestions.length + 1} - akan diisi Prompt 2 retry)`);
  }

  return {
    title: h2s[0] || "(fallback judul - retry Prompt 2)",
    slug: (h2s[0] || "fallback-artikel").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60),
    meta_description: "(fallback meta description - retry Prompt 2 untuk dapat 130-155 karakter).".slice(0, 155),
    outline,
    faq_questions: faqQuestions.slice(0, 7),
    entity_coverage_checklist: [],
    internal_link_plan: [],
    external_link_plan: [],
    recency_marker_target: "2026",
  };
}

export const outlineParser: AioParser<AioOutlineOutput> = createAioParser<AioOutlineOutput>(
  "AioOutlineOutput",
  isAioOutlineOutput,
  buildOutlineFallback,
);

// ---------- 4.3 blockParser ----------

function buildBlockFallback(rawText: string): AioBlockOutput {
  const trimmed = rawText.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const hasTable = /^\s*\|.*\|/m.test(trimmed);
  const hasOrdered = /^\s*\d+\.\s+/m.test(trimmed);
  // Deteksi H2 pertama sebagai fallback h2.
  const h2Match = trimmed.match(/^##\s+(.+)$/m);
  return {
    block_index: 1,
    h2: h2Match ? h2Match[1].trim() : null,
    content_markdown: trimmed,
    stats: {
      word_count: wordCount,
      has_direct_answer: false, // tidak bisa diukur dari rawText
      has_table: hasTable,
      has_ordered_list: hasOrdered,
      internal_links_used: [],
      external_links_used: [],
      entities_mentioned: [],
      recency_marker_present: false,
    },
  };
}

export const blockParser: AioParser<AioBlockOutput> = createAioParser<AioBlockOutput>(
  "AioBlockOutput",
  isAioBlockOutput,
  buildBlockFallback,
);

// ---------- 4.4 critiqueParser ----------

const CRITIQUE_POINT_NAMES: readonly string[] = [
  "TL;DR dengan 3 bullet",
  "Paragraf definisi 40-60 kata",
  "Tabel perbandingan",
  "Ordered list langkah",
  "Minimal 5 FAQ + JSON-LD",
  "Direct answer 40-60 kata di tiap H2",
  "Total 1.200-2.000 kata",
  "Internal 3-5 + External 1-3 link",
  "Struktur heading valid",
  "Author bio + tanggal publish + last updated",
  "Recency marker muncul",
  "Tidak ada paragraf > 120 kata",
  "Klaim numerik bersumber",
];

function buildCritiqueFallback(rawText: string): AioCritiqueOutput {
  const criteria: AioCriterion[] = CRITIQUE_POINT_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    score: 0,
    status: "gagal" as AioCriterionStatus,
    evidence: "(tidak ada - parser fallback)",
    issue: "Parser tidak berhasil mengekstrak output model. Artikel perlu direview manual.",
    fix_instruction: "(perlu revisi manual - Prompt 4 gagal di-parse)",
  }));
  const rewriteTargets: AioRewriteTarget[] = BLOCK_NAMES_SOP.map((name, i) => ({
    block_index: i + 1,
    h2: null,
    reason: `Parser fallback untuk blok ${name} - perlu dicek manual`,
    priority: "tinggi",
  }));
  return {
    is_passed: false,
    qa_score: 0,
    violations: criteria.map((c) => c.fix_instruction || ""),
    critique_notes: `Parser gagal mengekstrak output Prompt 4 dari teks sepanjang ${rawText.length} karakter. Artikel akan di-handle apa adanya. Pertimbangkan untuk retry Prompt 4 atau review manual.`,
    overall_score: 0,
    verdict: "gagal",
    summary: "Parser fallback - output tidak bisa di-parse sebagai JSON valid.",
    criteria,
    global_issues: ["Parser Prompt 4 gagal - output tidak valid JSON"],
    rewrite_targets: rewriteTargets,
  };
}

export const critiqueParser: AioParser<AioCritiqueOutput> = createAioParser<AioCritiqueOutput>(
  "AioCritiqueOutput",
  isAioCritiqueOutput,
  buildCritiqueFallback,
);

// ---------- 4.5 refinementParser ----------

function buildRefinementFallback(rawText: string): AioRefinementOutput {
  return {
    refined_markdown: rawText.trim(),
    is_refined: false,
    changed_blocks: [],
    refinement_notes: "Parser fallback - artikel dipakai apa adanya, tidak ada blok yang direvisi.",
    revised_blocks: [] as AioRefinedBlock[],
    unchanged_blocks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    global_fixes_applied: [],
    post_revision_notes: ["Prompt 5 fallback - pertimbangkan retry atau review manual."],
    expected_new_score: 0,
  };
}

export const refinementParser: AioParser<AioRefinementOutput> = createAioParser<AioRefinementOutput>(
  "AioRefinementOutput",
  isAioRefinementOutput,
  buildRefinementFallback,
);

// ---------- 4.6 schemaParser ----------

function safeJsonLdString(obj: unknown): string {
  try { return JSON.stringify(obj); } catch { return "{}"; }
}

function buildSchemaItemFallback(type: AioSchemaItem["type"], minimal: Record<string, unknown>): AioSchemaItem {
  return {
    type,
    json_ld_string: safeJsonLdString({ "@context": "https://schema.org", "@type": type, ...minimal }),
  };
}

function buildSchemaFallback(rawText: string): AioSchemaOutput {
  // Coba ambil judul dari teks.
  const h1 = rawText.match(/^#\s+(.+)$/m);
  const title = h1 ? h1[1].trim() : "(fallback judul)";
  const article = buildSchemaItemFallback("Article", {
    headline: title,
    datePublished: "2026-06-18",
    dateModified: "2026-06-18",
  });
  const faq = buildSchemaItemFallback("FAQPage", { mainEntity: [] });
  const breadcrumb = buildSchemaItemFallback("BreadcrumbList", {
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "" },
    ],
  });
  return {
    article,
    faq,
    howto: null,
    breadcrumb,
    validation: { article_valid: true, faq_valid: true, howto_valid: null, breadcrumb_valid: true },
    schema_block_html:
      `<script type="application/ld+json">${article.json_ld_string}</script>\n` +
      `<script type="application/ld+json">${faq.json_ld_string}</script>\n` +
      `<script type="application/ld+json">${breadcrumb.json_ld_string}</script>`,
  };
}

export const schemaParser: AioParser<AioSchemaOutput> = createAioParser<AioSchemaOutput>(
  "AioSchemaOutput",
  isAioSchemaOutput,
  buildSchemaFallback,
);

// ---------- 4.7 metaParser ----------

function buildMetaFallback(rawText: string): AioMetaOutput {
  // Ambil judul dari H1 jika ada, jika tidak pakai 5 kata pertama.
  const h1 = rawText.match(/^#\s+(.+)$/m);
  const title = h1 ? h1[1].trim().slice(0, 60) : rawText.trim().split(/\s+/).slice(0, 6).join(" ").slice(0, 60);
  // Slug dari judul.
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  // Meta description: ambil 155 char pertama dari paragraf pertama.
  const firstPara = rawText.replace(/^#.*$/m, "").trim().split(/\n\n/)[0] || "";
  const metaDescription = firstPara.replace(/\s+/g, " ").trim().slice(0, 155);

  return {
    title,
    meta_description: metaDescription || "(fallback - retry Prompt 7)",
    slug,
    og_title: title.slice(0, 95),
    og_description: metaDescription.slice(0, 200),
    twitter_title: title.slice(0, 70),
    twitter_description: metaDescription.slice(0, 200),
    canonical_url: null,
    focus_keyword: title.toLowerCase().split(/\s+/).slice(0, 3).join(" "),
    validation: {
      title_length_ok: title.length > 0 && title.length <= 60,
      meta_length_ok: metaDescription.length >= 130 && metaDescription.length <= 155,
      slug_format_ok: /^[a-z0-9-]+$/.test(slug) && slug.split("-").length >= 3 && slug.split("-").length <= 5,
      keyword_in_title: false,
      keyword_in_meta: false,
    },
  };
}

export const metaParser: AioParser<AioMetaOutput> = createAioParser<AioMetaOutput>(
  "AioMetaOutput",
  isAioMetaOutput,
  buildMetaFallback,
);


