import { Config } from "./constants";

export function buildPrompt(cfg: Config): string {
  const {
    keyword, title, extraKeywords, outline, language, articleType, articleSize, tone, pov,
    readability, country, brandVoice, details, withConclusion, withTables, withH3, withLists,
    withNotes, withQuotes, withKeyTakeaways, withFAQ, withBold, connectWeb, seoKeywords,
    internalLinkBaseUrl, internalLinkPages, extLinkType, extLinkUrls,
  } = cfg;

  const baseUrl = (internalLinkBaseUrl || "").replace(/\/+$/, "").trim();
  const hasInternalLink = baseUrl.length > 0;
  const hasManualPages = (internalLinkPages || "").trim().length > 0;
  const hasManualExtLinks = extLinkType === "Manual" && (extLinkUrls || "").trim().length > 0;
  const currentYear = new Date().getFullYear();

  return `Kamu adalah SEO content writer senior${language && language !== "Indonesia" ? ` (tulis dalam ${language})` : ""}. Spesialisasimu: artikel yang dikutip Google AI Overviews dan Gemini ${currentYear}. Kamu menerapkan E-E-A-T, entity SEO, dan passage-level optimization.

Buat artikel LENGKAP dengan spesifikasi berikut:

Keyword utama: "${keyword}"
${title ? `Judul: ${title}` : `Buat judul H1 menarik (50-60 karakter) yang WAJIB mengandung keyword "${keyword}"`}
${extraKeywords ? `Keyword tambahan: ${extraKeywords}` : ""}
${seoKeywords ? `Keyword LSI yang wajib muncul natural: ${seoKeywords}` : ""}
Tipe: ${articleType} | Panjang: ${articleSize} | Nada: ${tone} | POV: ${pov} | Keterbacaan: ${readability} | Negara: ${country}
${brandVoice ? `Brand Voice: ${brandVoice}` : ""}
${details ? `Informasi wajib disertakan: ${details}` : ""}
${outline ? `Outline:\n${outline}` : ""}

=== ATURAN SEO ${currentYear} — WAJIB SEMUA ===

STRUKTUR HEADING:
1. H1 WAJIB mengandung keyword "${keyword}" — panjang 50-60 karakter
2. Minimal 2 H2 mengandung keyword atau sinonimnya secara natural
3. JANGAN heading generik: "Pendahuluan", "Isi Artikel", "Pembahasan" — heading harus spesifik dan deskriptif
4. Jika pakai H3, pastikan berada di bawah H2 (jangan loncat level H2 → H4)

DIRECT ANSWER PER SEKSI (sinyal paling kuat untuk AI Overview):
5. Setiap H2 WAJIB diawali paragraf "direct answer" 40-60 kata yang menjawab langsung intent seksi. Gunakan kalimat deklaratif: "X adalah...", "Cara melakukan Y adalah...", "Perbedaan A dan B terletak pada..."
6. JANGAN pembuka klise: "Pada artikel ini", "Di era digital ini", "Tidak bisa dipungkiri", "Seiring perkembangan teknologi", "Halo pembaca", "Pernahkah Anda berpikir"
7. Setiap seksi H2 harus bisa dipahami TANPA membaca seksi lain — tulis seolah Google hanya mengambil seksi itu saja untuk ditampilkan di AI Overview

KUALITAS DAN E-E-A-T:
8. Setiap klaim berupa angka/persentase/statistik WAJIB sebut sumber: "menurut [Nama Lembaga/Tahun]" atau "berdasarkan data [Sumber]"
9. Paragraf maksimal 120 kata — jika lebih, pecah jadi 2 paragraf
10. Hindari kata vague tanpa data: "banyak orang", "mayoritas", "sebagian besar pengguna", "umumnya" — ganti dengan angka spesifik atau hapus
11. Recency marker: tahun "${currentYear}" wajib muncul minimal 1x secara natural di artikel

KEYWORD DAN SEMANTIK:
12. Keyword "${keyword}" muncul di 100 kata pertama (paragraf pembuka)
13. Gunakan sinonim dan variasi keyword secara natural — hindari repetisi kata yang sama 3x berturut-turut dalam 1 paragraf
14. Sebutkan entitas terkait yang relevan: konsep, istilah teknis, merek, atau lembaga yang berkaitan dengan topik

FAQ (format wajib untuk schema compatibility):
15. Seksi ## FAQ dengan 5-7 pertanyaan & jawaban
16. Format WAJIB: "**P: [pertanyaan lengkap?]**" diikuti baris baru "**A:** [jawaban 1-3 kalimat, langsung ke inti]"
17. Pertanyaan FAQ harus berbeda dari H2 yang sudah ada — fokus pada intent yang belum dijawab di seksi sebelumnya

META:
18. Di akhir artikel tulis: META: [meta description 130-155 karakter mengandung keyword "${keyword}" dan manfaat yang jelas]

${withH3 ? "- Gunakan H3 sebagai sub-bagian dalam tiap H2 untuk topik yang butuh breakdown lebih detail." : ""}
${withTables ? "- WAJIB sertakan minimal 1 tabel perbandingan (header + minimal 3 baris data) menggunakan format Markdown." : ""}
${withLists ? "- Gunakan bullet list untuk fitur/manfaat dan ordered list untuk langkah-langkah step-by-step." : ""}
${withNotes ? "- Tambahkan kotak tips penting dengan format: > **💡 Tips:** [isi tips singkat]" : ""}
${withQuotes ? "- Sertakan kutipan data atau pakar dengan sebutan sumber yang jelas." : ""}
${withKeyTakeaways ? "- Tambahkan seksi ## Key Takeaways sebelum FAQ berisi 3-4 bullet poin utama artikel." : ""}
${withFAQ ? "- ## FAQ wajib ada dengan 5-7 Q&A format **P:**/**A:**." : "- ## FAQ wajib ada (5-7 Q&A format **P:**/**A:**)."}
${withConclusion ? "- ## Kesimpulan wajib ada dengan ringkasan 2-3 poin utama dan CTA singkat." : "- ## Kesimpulan atau ## Penutup wajib ada dengan ringkasan dan CTA."}
${withBold ? "- Bold kata kunci dan konsep penting untuk skimmability." : ""}
${connectWeb ? `- Sertakan data atau statistik terkini ${currentYear} — WAJIB sebut nama sumber secara eksplisit di teks.` : ""}

${hasInternalLink ? `=== INTERNAL LINKING ===
Sisipkan 2-4 internal link ke situs: ${baseUrl}
${hasManualPages ? `ATURAN FORMAT:
- Gunakan HANYA URL persis dari daftar berikut — DILARANG membuat path atau slug baru yang tidak ada di daftar.
- Format: [anchor text deskriptif](URL-persis-dari-daftar)
- Halaman yang tersedia:
${internalLinkPages}` : `ATURAN FORMAT:
- Markdown: [teks anchor deskriptif](${baseUrl}/path-halaman)
- Path: slug pendek bahasa Indonesia (huruf kecil, tanda hubung, tanpa spasi)
- BENAR: [cara memulai bisnis online](${baseUrl}/cara-memulai-bisnis-online)
- SALAH: duplikasi domain di URL
- Buat path URL yang relevan dengan topik konten.`}
` : ""}
${hasManualExtLinks ? `=== EXTERNAL LINKING ===
Sisipkan 1-3 external link ke sumber berikut sebagai referensi atau kutipan:
${extLinkUrls}
Format: [anchor text deskriptif](URL)
` : extLinkType === "Otomatis" ? `=== EXTERNAL LINKING ===
Sisipkan 1-2 external link ke sumber otoritatif yang BENAR-BENAR ADA dan Anda yakin URL-nya valid (Wikipedia Indonesia, situs .go.id, atau institusi resmi nasional/internasional yang terkenal). JANGAN mengarang URL — jika tidak yakin URL-nya, jangan tambahkan link.
` : extLinkType === "Tidak Ada" ? `=== EXTERNAL LINKING ===
LARANGAN KERAS: Artikel ini TIDAK BOLEH mengandung link Markdown atau HTML ke domain atau situs eksternal manapun. Jika ingin menyebutkan sumber, tulis nama institusinya saja tanpa URL.
` : ""}

Tulis artikel LENGKAP dalam bahasa natural. Jangan tambahkan komentar meta, instruksi, atau penjelasan di luar artikel.
Di akhir artikel (setelah ## Kesimpulan): META: [meta description 130-155 karakter mengandung keyword "${keyword}"]`;
}

export function buildTitlePrompt(keyword: string, count = 5): string {
  const currentYear = new Date().getFullYear();
  return `Buat ${count} judul artikel SEO untuk keyword "${keyword}".

Aturan:
- Keyword "${keyword}" ada di awal atau tengah judul
- Panjang 50-60 karakter
- Mengandung angka, tahun ${currentYear}, atau power word (Terbaik, Terbukti, Lengkap, Panduan, Cara)
- Bahasa Indonesia natural dan spesifik — jangan generik
- Satu judul boleh pakai format pertanyaan (Apa, Bagaimana, Mengapa)

Format: hanya daftar judul, satu per baris, tanpa nomor, tanpa bullet, tanpa penjelasan.`;
}
