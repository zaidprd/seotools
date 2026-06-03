import { Config } from "./constants";

export function buildPrompt(cfg: Config): string {
  const { keyword, title, extraKeywords, outline, language, articleType, articleSize, tone, pov,
    readability, country, brandVoice, details, withConclusion, withTables, withH3, withLists,
    withNotes, withQuotes, withKeyTakeaways, withFAQ, withBold, connectWeb, seoKeywords,
    internalLinkBaseUrl, internalLinkPages, extLinkType, extLinkUrls } = cfg;

  // Sanitasi base URL: hapus trailing slash dan pastikan tidak ada duplikasi
  const baseUrl = (internalLinkBaseUrl || "").replace(/\/+$/, "").trim();
  const hasInternalLink = baseUrl.length > 0;
  const hasManualPages = (internalLinkPages || "").trim().length > 0;

  // External link manual URLs
  const hasManualExtLinks = extLinkType === "Manual" && (extLinkUrls || "").trim().length > 0;

  return `Kamu adalah penulis konten SEO profesional${language && language !== "Indonesia" ? ` (tulis dalam ${language})` : ""}. Buat artikel LENGKAP dengan spesifikasi berikut:

Keyword utama: "${keyword}"
${title ? `Judul: ${title}` : `Buat judul H1 yang menarik dan WAJIB mengandung keyword "${keyword}"`}
${extraKeywords ? `Keyword tambahan: ${extraKeywords}` : ""}
${seoKeywords ? `Keywords yang wajib disertakan: ${seoKeywords}` : ""}
Tipe: ${articleType} | Panjang: ${articleSize} | Nada: ${tone} | POV: ${pov} | Keterbacaan: ${readability} | Negara: ${country}
${brandVoice ? `Brand Voice: ${brandVoice}` : ""}
${details ? `Detail wajib disertakan: ${details}` : ""}
${outline ? `Outline:\n${outline}` : ""}

=== ATURAN SEO WAJIB (target skor 100) ===
1. Keyword "${keyword}" WAJIB muncul di 100 kata pertama artikel (di paragraf pembuka)
2. Judul H1 WAJIB mengandung keyword "${keyword}" secara eksplisit
3. Minimal 1 heading H2 atau H3 WAJIB mengandung keyword "${keyword}"
4. Keyword density 1–2% (jangan over-stuffing, tapi pastikan natural muncul di paragraf penting)
5. Di akhir artikel WAJIB tulis: META: [meta description 130-155 karakter yang mengandung keyword "${keyword}"]
6. WAJIB ada section ## FAQ dengan 3-5 pertanyaan & jawaban relevan tentang "${keyword}"
7. WAJIB ada section ## Kesimpulan atau ## Penutup sebagai penutup artikel

=== STRUKTUR ARTIKEL ===
- H1: judul mengandung keyword
- Paragraf pembuka: keyword di 100 kata pertama
- H2${withH3 ? " dan H3" : ""}: sub-topik (minimal 1 H2 mengandung keyword)
${withTables ? "- Sertakan tabel perbandingan atau data relevan" : ""}
${withLists ? "- Gunakan bullet points atau daftar bernomor untuk keterbacaan" : ""}
${withNotes ? "- Tambahkan kotak catatan atau tips penting" : ""}
${withQuotes ? "- Sertakan kutipan pakar atau statistik terpercaya" : ""}
${withKeyTakeaways ? "- Seksi Key Takeaways di bagian akhir sebelum FAQ" : ""}
${withFAQ ? "- ## FAQ: 3-5 pertanyaan & jawaban (WAJIB)" : "- ## FAQ: 3-5 pertanyaan & jawaban (WAJIB untuk SEO)"}
${withConclusion ? "- ## Kesimpulan dengan CTA (WAJIB)" : "- ## Kesimpulan atau ## Penutup (WAJIB untuk SEO)"}
${withBold ? "- Bold kata-kata penting dan keyword" : ""}
${connectWeb ? "- Sertakan data, statistik, atau fakta terkini yang relevan" : ""}

${hasInternalLink ? `=== INTERNAL LINKING ===
Sisipkan 2-4 internal link ke situs: ${baseUrl}
ATURAN FORMAT LINK (penting, jangan dilanggar):
- Gunakan format Markdown: [teks anchor yang relevan](${baseUrl}/path-halaman)
- Path halaman: gunakan slug pendek dalam bahasa Indonesia (huruf kecil, tanpa spasi, pakai tanda hubung)
- CONTOH BENAR: [cara memulai bisnis](${baseUrl}/cara-memulai-bisnis)
- CONTOH SALAH: [cara memulai bisnis](${baseUrl}/${baseUrl.replace(/https?:\/\//, "")}/cara-memulai-bisnis) — jangan duplikasi domain!
- JANGAN pernah menulis domain lebih dari sekali dalam satu URL
${hasManualPages ? `Halaman yang tersedia untuk dilink:
${internalLinkPages}
Gunakan halaman-halaman di atas sebagai referensi URL yang tepat.` : "Buat URL path yang relevan dengan konten artikel."}
` : ""}
${hasManualExtLinks ? `=== EXTERNAL LINKING ===
Sisipkan 2-3 external link ke sumber terpercaya berikut (gunakan sebagai referensi atau kutipan):
${extLinkUrls}
Format: [anchor text deskriptif](URL)
` : extLinkType === "Otomatis" ? `=== EXTERNAL LINKING ===
Sisipkan 2-3 external link ke sumber terpercaya yang relevan (Wikipedia Indonesia, situs pemerintah, atau sumber otoritatif dalam topik ini). Format: [anchor text](URL)
` : ""}

Tulis artikel LENGKAP dalam bahasa natural. Jangan tambahkan komentar atau penjelasan di luar artikel.
Di akhir artikel (setelah ## Kesimpulan): META: [meta description 130-155 karakter mengandung keyword "${keyword}"]`;
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
