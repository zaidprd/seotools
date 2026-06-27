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

  return `Kamu adalah SEO content writer profesional ${currentYear} yang menulis seperti MANUSIA BERPENGALAMAN — bukan AI. Spesialisasimu: artikel yang dikutip Google AI Overviews, lolos detector AI, dan benar-benar dibaca sampai selesai oleh manusia.

Buat artikel LENGKAP dengan spesifikasi:
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
1. H1 WAJIB mengandung keyword "${keyword}" — panjang 50-60 karakter, spesifik dan menarik
2. Minimal 2 H2 mengandung keyword atau sinonimnya secara natural
3. JANGAN heading generik: "Pendahuluan", "Isi Artikel", "Pembahasan" — heading harus spesifik dan deskriptif
4. Jika pakai H3, pastikan berada di bawah H2 (jangan loncat level H2 → H4)

DIRECT ANSWER PER SEKSI (sinyal terkuat untuk Google AI Overview):
5. Setiap H2 WAJIB diawali paragraf "direct answer" 35-45 kata yang menjawab langsung intent seksi. Gunakan kalimat deklaratif: "X adalah...", "Cara melakukan Y adalah...", "Perbedaan A dan B terletak pada..."
6. Setiap seksi H2 harus bisa dipahami TANPA membaca seksi lain — tulis seolah Google hanya mengambil seksi itu saja untuk ditampilkan di AI Overview
7. Paragraf pertama artikel (sebelum H2 pertama) WAJIB mengandung keyword "${keyword}" dan menjawab search intent utama dalam 2-3 kalimat pertama

KUALITAS DAN E-E-A-T ${currentYear}:
8. Setiap klaim berupa angka/persentase/statistik WAJIB sebut sumber: "menurut [Nama Lembaga/Tahun]" atau "berdasarkan data [Sumber]"
9. WAJIB: setiap paragraf PENDEK, hanya 30-40 kata (2-3 kalimat). Paragraf yang lebih panjang HARUS dipecah jadi beberapa paragraf. Ini bikin artikel lega, nyaman dibaca, dan ramah mobile.
10. Recency marker: tahun "${currentYear}" wajib muncul minimal 1x secara natural

KEYWORD DAN SEMANTIK (target kepadatan Yoast/RankMath 1–1.5%):
11. Keyword "${keyword}" muncul di 100 kata pertama (idealnya dalam 1-2 kalimat awal)
12. KEPADATAN KEYWORD — WAJIB: keyword utama "${keyword}" beserta kombinasi kata intinya harus muncul natural sekitar 1x per 90-110 kata, tersebar merata di paragraf pembuka, minimal 2 subjudul (H2), isi tiap seksi, FAQ, dan kesimpulan. Target density 1–1.5% (artikel 1.500 kata ≈ 15-18 kemunculan; 1.000 kata ≈ 10-12). JANGAN keyword stuffing — pakai bentuk natural & variasi, jangan menumpuk di satu paragraf.
13. Gunakan sinonim dan variasi LSI secara natural — hindari mengulang kata yang sama 3x berturut-turut dalam 1 paragraf
14. Sebutkan entitas terkait yang relevan: konsep, istilah teknis, merek, atau lembaga yang berkaitan dengan topik
15. Keyword utama WAJIB muncul di minimal 1 subjudul (H2/H3) secara natural

FAQ (format wajib untuk schema compatibility):
14. Seksi ## FAQ dengan 5-7 pertanyaan & jawaban
15. Format WAJIB: "**P: [pertanyaan lengkap?]**" diikuti baris baru "**A:** [jawaban 1-3 kalimat, langsung ke inti]"
16. Pertanyaan FAQ harus berbeda dari H2 yang sudah ada — fokus pada intent yang belum dijawab

META:
17. Di akhir artikel tulis: META: [meta description 130-155 karakter mengandung keyword "${keyword}" dan manfaat yang jelas]

=== HUMANISASI WAJIB — ARTIKEL HARUS TERASA DITULIS MANUSIA ===

GAYA PENULISAN NATURAL:
- Variasikan panjang kalimat: campur kalimat pendek (5-12 kata) dengan kalimat panjang (20-30 kata). Jangan semua kalimat panjang rata.
- Gunakan 1-2 kalimat tanya retoris per artikel untuk melibatkan pembaca: "Kenapa ini penting?", "Apa yang terjadi kalau salah langkah?"
- Tambahkan transisi naratif alami antar-seksi — bukan "Selanjutnya," atau "Di bagian ini," tapi kalimat yang mengalir dari konteks seksi sebelumnya
- Sesekali gunakan kalimat pendek 1 baris sebagai penegas. Ini efektif.
- Boleh sisipkan 1-2 pendapat langsung: "Yang sering terlewat adalah...", "Kenyataannya...", "Dari praktik nyata..."

KATA & FRASA YANG DILARANG (pola AI yang mudah terdeteksi):
- "penting untuk diperhatikan", "tidak kalah penting", "sangat penting untuk", "perlu dicatat bahwa"
- "pada dasarnya", "pada intinya", "secara keseluruhan", "dalam hal ini", "hal ini menunjukkan"
- "memainkan peran penting", "berperan krusial", "menjadi kunci utama", "sangat berpengaruh"
- "Di era modern ini", "Di era digital", "seiring perkembangan zaman", "seiring berjalannya waktu"
- "tidak bisa dipungkiri", "sudah bukan rahasia lagi", "patut diakui", "tak dapat disangkal"
- "Pada artikel ini kita akan", "Mari kita bahas", "Simak penjelasan berikut"
- Jangan mulai 3 kalimat berturut-turut dengan kata atau pola yang sama

EXPERIENCE & AUTHORITY (sinyal E-E-A-T terkuat ${currentYear}):
- Minimal 1 seksi harus berisi insight praktis — sesuatu yang hanya diketahui praktisi, bukan sekadar rangkuman teori
- Cantumkan sudut pandang nyata: "Dalam praktiknya...", "Yang jarang disebutkan adalah...", "Perbedaan nyata di lapangan..."
- Boleh akui trade-off atau keterbatasan: "Ini tidak selalu berlaku untuk semua kasus, terutama jika..."
- Hindari generalisasi tanpa data: ganti "banyak orang", "mayoritas", "umumnya" dengan angka spesifik atau hapus

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
${hasManualPages ? `Sisipkan 2-4 internal link ke situs ${baseUrl}.
ATURAN FORMAT (WAJIB — CEGAH LINK 404):
- Gunakan HANYA URL persis dari daftar berikut — DILARANG KERAS membuat path atau slug baru yang tidak ada di daftar (link mengarang = 404).
- Format: [anchor text deskriptif](URL-persis-dari-daftar)
- Pilih halaman yang paling relevan dengan topik. Halaman yang tersedia:
${internalLinkPages}` : `Sisipkan 1-2 internal link ke HALAMAN UTAMA (beranda) situs: ${baseUrl}/
ATURAN FORMAT (WAJIB — CEGAH LINK 404):
- Tautkan HANYA ke beranda: ${baseUrl}/ — JANGAN menautkan ke halaman lain.
- DILARANG KERAS mengarang path/slug halaman seperti ${baseUrl}/judul-artikel atau ${baseUrl}/nama-topik. Halaman seperti itu belum tentu ada dan akan menghasilkan error 404.
- Gunakan anchor text natural yang relevan dengan nama brand/situs.
- Format: [anchor text relevan](${baseUrl}/)`}
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
- Mengandung angka, tahun ${currentYear}, atau power word (Terbaik, Terbukti, Lengkap, Panduan, Cara, Rahasia, Tips)
- Bahasa Indonesia natural dan spesifik — jangan generik
- Satu judul boleh pakai format pertanyaan (Apa, Bagaimana, Mengapa)
- Hindari judul klise seperti "Panduan Lengkap untuk Pemula" tanpa spesifik

Format: hanya daftar judul, satu per baris, tanpa nomor, tanpa bullet, tanpa penjelasan.`;
}
