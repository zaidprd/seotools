# Rancangan lib/aio-parser.ts

Dokumen ini adalah rancangan kerangka parser untuk 7 output dari `lib/prompt-aio.ts`. Tujuan: membersihkan output model (Claude/DeepSeek suka wrap di ```json, GPT/Flash kadang tambah preamble) lalu mengembalikan objek TypeScript yang sesuai kontrak interface.

## Prinsip Desain

1. **Defensive parsing** - output model tidak pernah dipercaya 100%. Selalu coba beberapa strategi sebelum fallback.
2. **Type-safe** - return type mengikuti interface `AioBriefOutput`, `AioOutlineOutput`, dst. Bukan `any` atau `unknown`.
3. **Stateless** - parser adalah pure function, tidak ada side effect, mudah di-mock untuk testing.
4. **Provider-aware** - beberapa strategi disesuaikan dengan `AioProviderId` (Claude/DeepSeek butuh strip fence yang lebih agresif).
5. **Graceful degradation** - kalau JSON gagal total, fallback ke markdown/heuristic, kembalikan objek minimal yang lolos type-check (jangan `null`/`undefined` di field wajib).

## Struktur File

```
lib/aio-parser.ts
+- Bagian 1: Tipe internal (CleaningStep, ParseAttempt, ParserResult)
+- Bagian 2: Helper pembersihan teks (stripFences, stripChatter, extractJsonBlock, dll)
+- Bagian 3: Interface AioParser<T> generic
+- Bagian 4: 7 parser instance (briefParser, outlineParser, dst)
+- Bagian 5: Validator per output (lightweight runtime check)
+- Bagian 6: Re-exporter untuk kemudahan import dari Route Handler
```

## 1. Tipe Internal

```ts
// Tahapan cleaning yang sudah dicoba. Untuk logging/debug.
export interface CleaningStep {
  name: string;             // "stripFences", "stripChatter", "extractJsonBlock"
  matched: boolean;         // true jika regex/heuristic menemukan match
  bytesRemoved: number;     // berapa byte yang dibuang
}

// Hasil satu attempt parse (sebelum lanjut ke attempt berikutnya).
export interface ParseAttempt<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  steps: CleaningStep[];    // jejak cleaning yang sudah dilakukan
  usedFallback: boolean;    // true jika parser pakai markdown/heuristic fallback
}

// Statistik yang dikembalikan caller untuk monitoring/log.
export interface ParseStats {
  rawBytes: number;
  cleanedBytes: number;
  attempts: number;
  totalTimeMs: number;
  providerId: AioProviderId;
}
```

## 2. Helper Pembersihan Teks (10-12 fungsi kecil)

Setiap helper berdiri sendiri, pure function, bisa diuji terpisah.

```ts
// Buang markdown code fence (```json ... ``` atau ``` ... ```) di awal/akhir teks.
function stripFences(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Buang preamble basa-basi di awal: "Tentu,", "Baik,", "Berikut adalah JSON:", "Here is the JSON:", "Sure,", dll.
function stripChatter(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Cari blok {...} atau [...] pertama yang balanced. Pakai stack-based scan, bukan regex naif
// (regex naif gagal untuk nested object).
function extractJsonBlock(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Buang trailing prose setelah JSON valid berakhir. Deteksi dengan cari } atau ] terakhir
// yang diikuti newline + non-whitespace prose.
function stripTrailingProse(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Buang komentar inline // ... dan /* ... */ yang kadang disisipkan model.
function stripJsonComments(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Normalisasi smart quote: ubah kutip melengkung ’ ke kutip lurus ' atau ".
function normalizeQuotes(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Repair trailing comma sebelum } atau ]. Model sering lupa hapus trailing comma.
function repairTrailingCommas(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Buang BOM + zero-width characters + non-printable whitespace.
function sanitizeWhitespace(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Decode escaped newlines/tabs yang kadang double-escape: \\n -> \n, \\t -> \t.
function unescapeJson(text: string): { text: string; matched: boolean; bytesRemoved: number };

// Strategi "brute force" terakhir: cari posisi { pertama dan } terakhir, potong sisanya.
function tryFirstBraceToLastBrace(text: string): { text: string; matched: boolean; bytesRemoved: number };
```

Catatan: `extractJsonBlock` pakai **stack-based scan** karena regex `\{[\s\S]*\}` akan贪婪 match sampai akhir, dan regex non-greedy `\{[\s\S]*?\}` bisa berhenti terlalu awal di nested object. Implementasi: iterate char-by-char, track depth `{ }` dan `[ ]`, abaikan yang di dalam string. Library yang sudah terbukti: `jsonc-parser` (npm) atau implementasi manual ~30 baris.

## 3. Interface AioParser<T> Generic

```ts
// Pola: 1 parser per expected output. 7 instance, satu per interface Aio*Output.
export interface AioParser<T> {
  // Strategy utama: JSON parsing setelah cleaning.
  parse(rawText: string, providerId: AioProviderId): ParseAttempt<T>;

  // Strategy fallback: parse dari markdown/heuristic kalau JSON gagal.
  // Return objek minimal yang lolos type-check, TANPA claim sebagai artikel final.
  parseMarkdownFallback(rawText: string): T;
}

// Factory untuk membuat parser generic + validator.
export function createAioParser<T>(
  schemaName: string,
  validator: (obj: unknown) => obj is T,
  fallbackBuilder: (rawText: string) => T,
): AioParser<T>;
```

## 4. 7 Parser Instance (Peta Builder ke Parser)

| Parser instance | Tipe T | Validator ringkas | Fallback builder ringkas |
|-----------------|--------|-------------------|--------------------------|
| `briefParser` | `AioBriefOutput` | 13 field wajib + `main_entity.name` non-empty | Ekstrak keyword dari teks, isi `main_entity.name = keyword`, sisanya `[]`/`""` |
| `outlineParser` | `AioOutlineOutput` | `outline.length === 10` + tiap `block` 1-10 urut | Generate 10 blok default name, `target_words = wordTarget/10` |
| `blockParser` | `AioBlockOutput` | `block_index` 1-10 + `content_markdown` non-empty | Wrap seluruh teks jadi `content_markdown`, `stats` seminimal mungkin |
| `critiqueParser` | `AioCritiqueOutput` | `criteria.length === 13` + `rewrite_targets` hanya berisi `gagal` | Semua criteria `gagal` dengan `fix_instruction` = "(perlu revisi manual)", `rewrite_targets` = 10 blok |
| `refinementParser` | `AioRefinementOutput` | `refined_markdown` non-empty + `revised_blocks.length` + `unchanged_blocks` komplemen 1-10 | `refined_markdown` = `rawText`, `revised_blocks = []`, `unchanged_blocks = [1..10]` |
| `schemaParser` | `AioSchemaOutput` | Tiap `json_ld_string` lolos `JSON.parse` + ada `@context`/`@type` | Generate schema minimal dari `outline.title` saja, valid = false semua |
| `metaParser` | `AioMetaOutput` | `title.length <= 60` + `meta_description.length 130-155` + `slug` regex `[a-z0-9-]+` | Pakai `outline.title`/`outline.meta_description`/`outline.slug` jika ada, kalau tidak generate dari `keyword` |

## 5. Validator per Output (Lightweight Runtime Check)

Validator adalah type predicate `(obj: unknown) => obj is T` yang dipanggil setelah `JSON.parse`. Tidak pakai library berat seperti Zod/Ajv untuk hemat bundle size.

```ts
function isAioBriefOutput(obj: unknown): obj is AioBriefOutput { ... }
// Pola: cek tipe primitif (string/number/boolean), cek field wajib ada,
// cek panjang array (FAQ 5-7, must_include_facts 3-6, dll).

function isAioOutlineOutput(obj: unknown): obj is AioOutlineOutput { ... }
function isAioBlockOutput(obj: unknown): obj is AioBlockOutput { ... }
function isAioCritiqueOutput(obj: unknown): obj is AioCritiqueOutput { ... }
function isAioRefinementOutput(obj: unknown): obj is AioRefinementOutput { ... }
function isAioSchemaOutput(obj: unknown): obj is AioSchemaOutput { ... }
function isAioMetaOutput(obj: unknown): obj is AioMetaOutput { ... }
```

Setiap validator return `false` jika ada 1 field wajib yang tipe-nya salah atau hilang. Caller (Route Handler) akan retry dengan `parseMarkdownFallback` jika validator false.

## 6. Strategi Pipeline Cleaning (Pipeline Steps)

Setiap parser pakai pipeline cleaning yang **sama** untuk 7 instance, tapi urutan/strategi bisa beda per `providerId`:

```
Input rawText
  |
  v
1. sanitizeWhitespace (buang BOM, zero-width)
  |
  v
2. stripFences (buang ```json ... ```)
  |
  v
3. stripChatter (buang preamble "Tentu,", "Here is", dll)
  |
  v
4. extractJsonBlock (cari balanced { ... } pakai stack-scan)
  |
  v
5. stripTrailingProse (buang teks setelah JSON)
  |
  v
6. stripJsonComments (buang // dan /* */)
  |
  v
7. normalizeQuotes (smart quote -> straight quote)
  |
  v
8. repairTrailingCommas (buang koma sebelum } atau ])
  |
  v
9. unescapeJson (\\n -> \n, \\t -> \t)
  |
  v
10. JSON.parse
  |
  v
11. validator<T>(obj)
  |
  +--[valid]--> return ParseAttempt{ success: true, data: T, usedFallback: false }
  |
  +--[invalid]--> ParseAttempt{ success: false } -> caller retry dengan parseMarkdownFallback
```

Branch per provider:
- **Gemini/OpenAI/SumoPod/OpenRouter** (nativeJsonMode=true): skip step 2, 3, 6 (model ini jarang wrap, jarang chatter, jarang comment). Tapi step 4, 5, 7 tetap jalan untuk safety.
- **Claude/DeepSeek** (nativeJsonMode=false): jalankan semua 10 step secara berurutan.

## 7. Strategi Markdown Fallback (Per Parser)

Dipakai kalau JSON total gagal. Tujuannya: kembalikan objek TypeScript yang valid, BUKAN artikel yang sempurna.

### `parseMarkdownFallback` untuk `briefParser`
- Cari "Keyword utama: X" atau "primary_keyword: X" di teks -> set `primary_keyword`.
- Set `search_intent = "informational"` default.
- Set `main_entity.name = primary_keyword`, `synonyms_id = []`, `related_entities = []`.
- Sisanya default empty.

### `parseMarkdownFallback` untuk `outlineParser`
- Cari heading H2/H3 di teks Markdown -> extract sebagai `outline[i].h2`.
- Generate 10 blok default dengan `name` urut SOP-AIO, `target_words = wordTarget/10`.
- FAQ dari section "FAQ" atau "Pertanyaan Umum".

### `parseMarkdownFallback` untuk `blockParser`
- Trim rawText, set `content_markdown = rawText.trim()`.
- `block_index = 1`, `h2 = null`.
- Hitung `word_count` sederhana, `has_table = /\|.*\|/m.test()`, `has_ordered_list = /^\d+\./m.test()`.

### `parseMarkdownFallback` untuk `critiqueParser`
- Set semua 13 `criteria` ke `gagal` dengan `fix_instruction = "(perlu revisi manual)"`.
- `rewrite_targets` = 10 blok dengan `priority = "tinggi"`.
- `overall_score = 0`, `verdict = "gagal"`, `is_passed = false`, `qa_score = 0`.

### `parseMarkdownFallback` untuk `refinementParser`
- `refined_markdown = rawText.trim()`.
- `revised_blocks = []`, `unchanged_blocks = [1,2,...,10]`, `is_refined = false`.
- `expected_new_score = 0` (artikel di-handle apa adanya).

### `parseMarkdownFallback` untuk `schemaParser`
- Generate schema minimal dari `outline.title` jika ada (di-pass via closure/factory).
- `article.json_ld_string = JSON.stringify({...minimal...})` + valid = true hanya jika `JSON.parse` dari string-nya valid.
- `faq`, `howto` (null), `breadcrumb` minimal.

### `parseMarkdownFallback` untuk `metaParser`
- `title = (outline.title || keyword).slice(0, 60)`.
- `meta_description = (outline.meta_description || "").slice(0, 155)` atau generate dari teks.
- `slug = (outline.slug || keyword.toLowerCase().replace(/\s+/g, "-"))`.
- Validation flags diset eksplisit (false jika tidak lolos regex).

## 8. Re-export untuk Kemudahan Import

```ts
// di akhir file:
export {
  briefParser,
  outlineParser,
  blockParser,
  critiqueParser,
  refinementParser,
  schemaParser,
  metaParser,
} from "./_parsers";   // atau definisikan di sini langsung
```

## 9. Catatan untuk Iterasi Berikutnya

- **Testing**: tiap parser punya test fixture minimal 5 sample (1 clean JSON, 1 wrapped in ```json, 1 dengan preamble, 1 dengan trailing prose, 1 markdown fallback).
- **Logging**: setiap `ParseAttempt` dicatat ke console dengan `parseStats.providerId` + `bytesRemoved` step-by-step untuk debugging.
- **Retry policy**: Route Handler yang memutuskan. Parser sendiri tidak retry. Kontrak: `parse()` dipanggil max 1x per attempt; kalau gagal, Route Handler retry panggil API provider atau panggil `parseMarkdownFallback`.
- **Dependency**: hanya butuh `jsonc-parser` opsional untuk handle JSON-with-comments yang lebih robust. Tanpa dependency: stack-scan manual ~30 baris sudah cukup untuk semua 7 parser.
- **Bundle size**: dengan 7 parser + 10 helper + 7 validator, estimasi ~500 baris TypeScript, ~15 KB minified. Cukup ringan untuk di-import langsung di Route Handler.

## 10. Contoh Signature Penggunaan (untuk caller)

```ts
import { briefParser } from "@/lib/aio-parser";
import { buildResearchPrompt, resolveProviderId, PROVIDER_CAPS } from "@/lib/prompt-aio";

const model = MODELS.find(m => m.id === "claude-sonnet-4-6")!;
const providerId = resolveProviderId(model);
const caps = PROVIDER_CAPS[providerId];

const prompt = buildResearchPrompt({ input, model, providerId, caps });
const rawText = await callProvider(prompt, providerId);   // string dari API

const attempt = briefParser.parse(rawText, providerId);
if (attempt.success && attempt.data) {
  // Sukses: pakai attempt.data (type: AioBriefOutput)
  saveBriefToMemory(attempt.data);
} else {
  // Gagal: pakai fallback
  const brief = briefParser.parseMarkdownFallback(rawText);
  // brief punya semua field wajib, tapi data kosong/default
  logWarning("briefParser fallback used", { steps: attempt.steps, error: attempt.error });
  saveBriefToMemory(brief);
}
```

Rancangan ini menjaga 3 invariant: (1) parser return TypeScript type, bukan `any`; (2) TIDAK PERNAH return `null`/`undefined` untuk field wajib, fallback menjamin itu; (3) Route Handler bisa logging `steps` untuk debugging tanpa parser harus expose detail internal.
