# Blueprint Konten AI Overviews (Gemini / Google SGE)

Dokumen ini adalah SOP logika untuk modul generator artikel pada aplikasi `seotools`. Tujuannya: memproduksi artikel yang **berpeluang besar dikutip** oleh Google AI Overviews dan Gemini.

## 1. Prinsip Ranking AI Overviews

Google AI Overviews memilih cuplikan berdasarkan:

- **Entity salience** — sejauh mana halaman menjelaskan entitas (orang, produk, konsep) secara eksplisit dan terstruktur.
- **Topical authority** — kelengkapan sub-topik dalam satu halaman (comprehensive coverage).
- **Factual density + Sourceability** — klaim spesifik yang bisa dilacak ke sumber primer.
- **Passage-level clarity** — tiap bagian bisa berdiri sendiri menjawab satu pertanyaan.
- **Structured alignment** — markup JSON-LD (Article, FAQPage, HowTo, Author) yang konsisten dengan konten.
- **E-E-A-T** — author bio, pengalaman, dan transparansi redaksi.

## 2. SOP Outline Artikel (SOP-AIO)

Setiap artikel mengikuti skeleton 10 blok. Generator tinggal mengisi payload ke template ini.

1. **Hook + TL;DR** (40-60 kata)
   - 1 kalimat masalah, 1 kalimat solusi, 3 bullet ringkasan jawaban.
   - Wajib ada angka/persentase agar kutip-eligible.
2. **Definisi / What is it** (60-80 kata)
   - Jawab "apa itu X" dalam 1 paragraf definisi.
   - Cocok untuk snippet definisi AI Overview.
3. **Why it matters / Konteks** (80-100 kata)
   - Statistik, tren, atau studi kasus 1 tahun terakhir.
   - Wajib ada minimal 1 kutipan/angka dengan sumber.
4. **Core Framework / Cara kerja** (150-200 kata)
   - 3-5 langkah bernomor.
   - Tiap langkah: nama langkah + 1 kalimat penjelasan + 1 contoh konkret.
5. **Comparison / Tabel** (100-150 kata + tabel)
   - Bandingkan minimal 3 opsi/pendekatan.
   - Pakai `<table>` HTML + heading "Perbandingan ...".
6. **Step-by-step guide** (200-300 kata)
   - Daftar `<ol>` bernomor, tiap langkah verifiable.
   - Tambahkan `<strong>` pada keyword aksi.
7. **FAQ** (5-7 pertanyaan)
   - Schema `FAQPage` JSON-LD.
   - Jawaban 1-3 kalimat, langsung to-the-point.
8. **Common mistakes / Pitfalls** (80-120 kata)
   - 4-6 bullet, tiap bullet: kesalahan + dampak + perbaikan.
9. **Conclusion + CTA** (60-80 kata)
   - Ringkas 1 paragraf + 1 ajakan (internal link).
10. **Sources / References** (minimal 3 sumber primer)
    - Tautan ke jurnal, data resmi, atau Wikipedia.
    - Format: `Nama Sumber - URL - Diakses 2026-06-18`.

## 3. Kriteria Konten "AI Overview Ready"

- **Panjang ideal**: 1.200-2.000 kata. Artikel di bawah 800 kata hampir tidak pernah dikutip.
- **Density jawaban langsung**: minimal 1 paragraf "direct answer" 40-60 kata di tiap section H2.
- **Bentuk jawab**: kalimat deklaratif, subjek-predikat-objek jelas. Hindari "Anda bisa", "Mungkin", "Biasanya".
- **Format penanda kutip**:
  - Tabel HTML perbandingan.
  - List bernomor untuk langkah.
  - Definisi dalam 1 paragraf utuh.
  - Statistik dalam `<strong>` atau blok kutipan.
- **Struktur heading**: H1 unik, H2 untuk blok utama, H3 untuk sub-topik. Tidak boleh lonjong level.
- **Internal linking**: 3-5 link kontekstual ke artikel cluster lain.
- **External linking**: 1-3 link ke sumber otoritatif (.gov, .edu, jurnal, Wikipedia).
- **Entity coverage**: sebutkan sinonim, nama Inggris/Indonesia, dan entity terkait (orang, tempat, tools) minimal 1 kali.
- **Recency signal**: sertakan tahun "2025" / "2026" di judul atau sub-judul minimal 1 kali.

## 4. Prompt Engineering Layer (Logika)

Layer ini yang akan diimplementasikan di kode nanti. Saat ini hanya pemetaan.

### 4.1 Variabel Input
- `primary_keyword`
- `secondary_keywords[]` (3-5)
- `search_intent` (informational / commercial / transactional)
- `target_audience` (pemula / profesional / UMKM / enterprise)
- `article_type` (how-to, listicle, comparison, definition, news)
- `language` (id-ID default, en-US opsional)
- `geo` (ID / global)
- `tone` (profesional, konversasional, otoritatif)
- `word_target` (default 1600)

### 4.2 Pipeline Prompt
- **Prompt 1 - Research Brief**: minta model menghasilkan outline 10-blok, daftar FAQ, dan gap analysis kompetitor (Top 3 SERP).
- **Prompt 2 - Outline Validation**: cek outline punya direct answer di tiap H2, entitas tercakup, dan ada minimal 1 data point per section.
- **Prompt 3 - Draft Generation**: isi outline dengan constraint panjang, gaya, dan schema.
- **Prompt 4 - Self-Critique**: model menilai ulang draft dengan checklist (lihat bagian 5).
- **Prompt 5 - Refine**: revisi otomatis berdasarkan self-critique + aturan E-E-A-T.
- **Prompt 6 - JSON-LD Generator**: output 3 schema (Article, FAQPage, HowTo atau BreadcrumbList).
- **Prompt 7 - Meta Generator**: title <= 60 char, meta description <= 155 char, slug 3-5 kata.

### 4.3 Guardrails Prompt
- Tolak output jika `word_count` < `word_target` x 0.8.
- Tolak jika ada klaim tanpa sumber pada section Statistik.
- Paksa minimal 1 kalimat "Direct Answer" di awal tiap H2.
- Paksa list/tabel pada section perbandingan dan langkah.

## 5. Quality Gate (Checklist Sebelum Publish)

- Ada TL;DR dengan 3 bullet.
- Minimal 1 paragraf definisi (40-60 kata).
- Minimal 1 tabel perbandingan.
- Minimal 1 ordered list langkah.
- Minimal 5 FAQ + JSON-LD.
- Setiap section H2 punya "direct answer" 40-60 kata.
- Total kata 1.200-2.000.
- 3-5 internal link + 1-3 external link otoritatif.
- Schema Article + FAQPage + (HowTo/BreadcrumbList) valid.
- Author bio + tanggal publikasi + last updated.
- Recency marker (tahun) minimal 1x.
- Tidak ada paragraf di atas 120 kata.
- Tidak ada klaim numerik tanpa sumber.

## 6. Skema JSON-LD yang Wajib Dihasilkan

1. **Article** - headline, author, datePublished, dateModified, image, publisher.
2. **FAQPage** - Question/Answer list.
3. **HowTo** (jika artikel how-to) - name, step[], totalTime, tool[].
4. **BreadcrumbList** - posisi artikel dalam cluster topik.

## 7. Topical Cluster Strategy

Satu artikel pilar (Pillar) + 5-8 artikel cluster + 3-5 long-tail.

- **Pillar**: 1.500-2.000 kata, membahas topik utama.
- **Cluster**: 1.000-1.500 kata, menjawab 1 pertanyaan spesifik, link balik ke Pillar.
- **Long-tail**: 600-900 kata, target query sangat spesifik.

Internal link graph harus menyerupai jaring (mesh), bukan pohon linear.

## 8. Recency + Trust Signals

- Tampilkan "Diperbarui: 2026-06-18" di header artikel.
- Tampilkan author name + bio singkat + link profil.
- Cantumkan "Disunting oleh: [Editor]" jika ada editor manusia.
- Gunakan HTTPS, sertakan halaman "Tentang Kami" + "Kebijakan Editorial".

## 9. Failure Mode yang Harus Dihindari

- Paragraf pembuka tanpa jawaban langsung.
- Heading H2 yang terlalu generik ("Pendahuluan", "Kesimpulan" saja).
- FAQ tanpa schema.
- Klaim tanpa angka/sumber.
- Artikel tanpa internal link keluar-masuk.
- Tone bertele-tele di paragraf pertama (pembuka harus padat).

## 10. Output Akhir Generator (Payload JSON)

```json
{
  "title": "string <= 60",
  "slug": "string",
  "meta_description": "string <= 155",
  "h1": "string",
  "outline": ["H2 ...", "H2 ..."],
  "body_html": "string (semantic HTML)",
  "faq": [{ "q": "...", "a": "..." }],
  "schemas": {
    "article": {},
    "faq": {},
    "howto": null
  },
  "internal_links": ["slug lain"],
  "external_links": [{ "label": "...", "url": "...", "domain": "..." }],
  "word_count": 0,
  "reading_time_min": 0,
  "primary_keyword": "",
  "secondary_keywords": [],
  "qa_score": 0
}
```

---

**Catatan implementasi**: ketika Anda siap menulis kode, mulailah dari payload JSON di bagian 10 sebagai kontrak antarmuka antar modul (research ke draft ke refine ke schema ke publish).
