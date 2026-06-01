import { Config } from "./constants";

export function buildPrompt(cfg: Config): string {
  const { keyword, title, extraKeywords, outline, language, articleType, articleSize, tone, pov,
    readability, country, brandVoice, details, withConclusion, withTables, withH3, withLists,
    withNotes, withQuotes, withKeyTakeaways, withFAQ, withBold, connectWeb, seoKeywords } = cfg;
  return `Kamu adalah penulis konten SEO profesional${language && language !== "Indonesia" ? ` (tulis dalam ${language})` : ""}. Buat artikel dengan spesifikasi:

Keyword utama: ${keyword}
${title ? `Judul: ${title}` : "Buat judul SEO menarik yang mengandung keyword"}
${extraKeywords ? `Keyword tambahan: ${extraKeywords}` : ""}
${seoKeywords ? `Keywords untuk disertakan: ${seoKeywords}` : ""}
Tipe: ${articleType} | Panjang: ${articleSize} | Nada: ${tone} | POV: ${pov} | Keterbacaan: ${readability} | Negara: ${country}
${brandVoice ? `Brand Voice: ${brandVoice}` : ""}
${details ? `Detail wajib: ${details}` : ""}
${outline ? `Outline: ${outline}` : ""}

Struktur wajib:
- Judul H1 mengandung keyword utama
- H2${withH3 ? " dan H3" : ""} sebagai sub-topik
${withTables ? "- Sertakan tabel perbandingan" : ""}
${withLists ? "- Gunakan bullet/daftar bernomor" : ""}
${withNotes ? "- Tambahkan kotak catatan/tips" : ""}
${withQuotes ? "- Sertakan kutipan/statistik" : ""}
${withKeyTakeaways ? "- Seksi Key Takeaways" : ""}
${withFAQ ? "- FAQ 3-5 pertanyaan & jawaban" : ""}
${withConclusion ? "- Kesimpulan + CTA" : ""}
${withBold ? "- Bold kata penting" : ""}
${connectWeb ? "- Sertakan data terkini" : ""}

Tulis artikel LENGKAP dalam Bahasa Indonesia natural.
Di akhir: META: [meta description 150-160 karakter]`;
}

export function buildTitlePrompt(keyword: string, count = 5): string {
  return `Buat ${count} judul artikel SEO untuk keyword "${keyword}".

Aturan:
- Keyword "${keyword}" ada di awal atau tengah judul
- Panjang 50-60 karakter
- Mengandung angka, power word (Terbaik, Terbukti, Lengkap, Rahasia, Panduan), atau kata sentiment (Mudah, Cepat, Ampuh, Efektif, Praktis)
- Bahasa Indonesia natural

Format: hanya daftar judul, satu per baris, tanpa nomor, tanpa bullet, tanpa penjelasan.`;
}
