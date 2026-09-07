# Single-Post SEO MVP Plan

## Product decisions

- Fokus hanya pada single-post; bulk disembunyikan dan tidak dikembangkan dulu.
- Model tidak pernah dipilih atau ditampilkan kepada pengguna.
- Primary sementara: Claude Sonnet melalui SumoPod.
- Fallback: Claude Haiku melalui SumoPod, hanya untuk timeout, 429, 5xx, network error, respons kosong, atau output tahap terstruktur yang tidak valid.
- Adapter Anthropic resmi disiapkan agar primary dapat dipindahkan lewat environment variable tanpa mengubah UI/API.
- Satu artikel dibuat dengan pipeline tiga tahap, bukan single prompt lama atau pipeline AIO 16 call.
- Gambar memakai preset SVG/HTML deterministik yang dapat dipreview dan dipilih, kemudian dirender menjadi WebP tanpa image-generation API.
- Artikel, metadata, gambar template, dan upload manual dapat direview/edit sebelum dikirim ke WordPress.
- WordPress mendukung draft, publish langsung, dan schedule.
- Mayar tetap menjadi payment provider; produk coba adalah pembelian sekali Rp5.000 untuk satu artikel.

## Target user flow

1. User login dan membeli `Coba 1 Artikel — Rp5.000` atau paket lanjutan.
2. User memasukkan keyword, judul opsional, target pembaca, konteks brand, panjang 1.500–2.000 kata, dan sumber/link opsional.
3. Server menjalankan strategy → draft → polish.
4. Draft artikel disimpan dan dibuka di editor.
5. User memilih preset gambar dari gallery preview atau upload gambar manual.
6. User mengedit title, slug, body, metadata, alt text, dan featured image.
7. User menyimpan sebagai draft WordPress, publish langsung, atau menjadwalkan.

## Milestone 1 — Provider dan pipeline artikel

### Provider abstraction

Tambahkan modul server-only:

- `lib/ai/types.ts`
- `lib/ai/provider.ts`
- `lib/ai/sumopod.ts`
- `lib/ai/anthropic.ts`
- `lib/ai/generate-with-fallback.ts`

Konfigurasi:

```env
AI_PRIMARY_PROVIDER=sumopod
AI_PRIMARY_MODEL=claude-sonnet-4-6
AI_FALLBACK_PROVIDER=sumopod
AI_FALLBACK_MODEL=claude-haiku-4-5
SUMOPOD_BASE_URL=https://ai.sumopod.com/v1
SUMOPOD_API_KEY=
ANTHROPIC_API_KEY=
```

Nama model aktual harus diverifikasi dari katalog SumoPod sebelum deployment. Saat pindah ke API resmi, ubah provider/model melalui env saja.

Fallback maksimal satu kali per tahap. Jangan fallback pada error input, auth, entitlement, database, atau request yang dibatalkan user.

### Pipeline tiga tahap

Tambahkan:

- `lib/generation/contracts.ts`
- `lib/generation/prompts.ts`
- `lib/generation/parsers.ts`
- `lib/generation/pipeline.ts`

Tahapan:

1. **Strategy** — search intent, audience, angle, title, slug, entities, outline, dan kebutuhan sumber dalam JSON.
2. **Draft** — artikel lengkap 1.500–2.000 kata dalam satu respons Markdown; URL hanya boleh berasal dari daftar yang diberikan server/user.
3. **Polish & package** — perbaikan repetisi/struktur dan output JSON berisi final Markdown, title, slug, meta title, meta description, schema, dan warnings.

Validasi deterministik setelah AI:

- Word count dalam toleransi target.
- Tepat satu H1.
- Heading tidak kosong/loncat secara tidak valid.
- Meta description sesuai batas.
- URL internal/external berasal dari allowlist.
- Tidak ada data URI atau SVG mentah dalam artikel.
- Schema dapat diparse.
- Output bukan placeholder/fallback kosong.

### Endpoint aktif

Refactor:

- `app/api/generate/route.ts`
- `lib/api.ts`
- `app/dashboard/generate/page.tsx`

Client mengirim setting produk, bukan `modelId`. Gunakan `Idempotency-Key` UUID. Response mengembalikan article DTO dan tidak mengandung provider/model/log internal.

Setelah endpoint baru aktif:

- Hapus pemanggilan `generateAioArticle()`.
- Jadikan `app/api/aio-generate/route.ts` legacy/410 lalu hapus setelah tidak ada caller.
- Hapus pipeline loop 10 blok dan prompt/parser AIO yang tidak lagi dipakai.

### Acceptance criteria

- Normal generation melakukan tepat tiga model call.
- Maksimal enam call bila semua tahap fallback.
- Sonnet primary dan Haiku fallback tidak terlihat di UI/response.
- Setiap sukses menghasilkan article ID persisten.
- Setiap kegagalan mengembalikan entitlement secara idempotent.

## Milestone 2 — Database, billing invariants, dan artikel persisten

### Audit schema remote terlebih dahulu

Repo belum memiliki baseline migration untuk `users` dan `articles`. Sebelum menulis baseline, dump/inspect schema Supabase production agar migration tidak menduplikasi atau merusak tabel yang sudah ada.

Tambahkan migration forward-only untuk menyelaraskan minimal:

- `users`
- `articles`
- `generation_runs`
- `article_assets`
- `payments`
- auth signup trigger
- RLS dan grants

### Artikel

`articles` minimal menyimpan:

- owner, status, keyword, title, slug
- content Markdown/HTML
- meta title/description dan schema JSON
- word count
- featured asset
- WordPress post ID/URL/status
- scheduled/published timestamps
- created/updated timestamps

Jangan gunakan `model_id` sebagai data yang ditampilkan. Telemetri provider/model aktual hanya disimpan server-side di `generation_runs`.

### Generation transaction

Tambahkan RPC atomik/idempotent:

- `start_generation`
- `complete_generation`
- `fail_generation`

`generation_runs` memakai unique `(user_id, idempotency_key)` agar retry browser tidak menagih dua kali atau membuat artikel ganda.

### Article API

Tambahkan:

- `GET /api/articles/[id]`
- `PATCH /api/articles/[id]`

PATCH memvalidasi ownership, sanitasi HTML, normalisasi slug, menghitung ulang word count, dan memakai `updatedAt` untuk optimistic concurrency (`409` bila draft sudah berubah).

### Editor

Refactor:

- `components/ResultPanel.tsx`
- `app/dashboard/generate/page.tsx`
- tambah `app/dashboard/articles/[id]/page.tsx`
- `app/documents/page.tsx`

Setelah generate, buka editor berdasarkan article ID. Tambahkan autosave debounced dan tombol simpan eksplisit. Publish harus menunggu save berhasil. Refresh browser harus memuat draft terakhir.

Hilangkan model selector/badge/tips dari:

- `components/ModelSelector.tsx`
- `components/SettingsForm.tsx`
- `components/ResultPanel.tsx`
- `app/dashboard/generate/page.tsx`
- pricing, account, documents, dan dashboard

### Acceptance criteria

- Edit title, slug, metadata, dan body bertahan setelah refresh.
- Autosave error terlihat dan tidak mengklaim tersimpan.
- Dua tab tidak saling overwrite diam-diam.
- Model/provider tidak tampil di seluruh UI.

## Milestone 3 — Preset gambar dan upload manual

### Static presets

Tambahkan:

- `lib/image-templates/types.ts`
- `lib/image-templates/presets.ts`
- `lib/image-templates/render-svg.ts`
- `components/images/ImageTemplateGallery.tsx`

Mulai dengan 6 preset 1200×630:

- editorial dark
- editorial light
- gradient card
- minimal grid
- bold type
- checklist/statistic

Preset menerima field yang dibatasi: title, keyword, brand, accent palette, dan optional short subtitle. Semua teks harus di-escape; user tidak boleh mengirim SVG/HTML arbitrer.

Gallery menampilkan preview aktual menggunakan judul artikel dan memungkinkan user memilih preset sebelum render. MVP belum memerlukan template builder bebas atau revision history penuh.

### Render dan storage

Tambahkan `sharp` untuk SVG → WebP server-side. Tambahkan endpoint:

- `POST /api/articles/[id]/assets/template`
- `POST /api/articles/[id]/assets/upload`
- `PATCH/DELETE /api/articles/[id]/assets/[assetId]`

Simpan WebP di Supabase Storage privat dan metadata di `article_assets`. Jangan simpan gambar sebagai base64 di artikel/database.

Upload manual:

- JPEG/PNG/WebP saja.
- Maksimum 5 MB.
- Decode dengan `sharp`, auto-orient, strip metadata, resize maksimal 2000 px, lalu WebP.
- Alt text dapat diedit.

Editor menyediakan:

- preview preset
- insert gambar di cursor
- edit alt text
- remove dari body
- set featured image secara eksplisit
- upload manual

Nonaktifkan generator gambar AI dari single-post. Endpoint Cloudflare/SumoPod/Gemini legacy dihapus setelah tidak ada caller.

### Acceptance criteria

- Preview gallery tidak memanggil AI.
- Input/preset sama menghasilkan visual sama.
- Output final selalu WebP.
- Tidak ada base64/SVG mentah dalam artikel tersimpan.
- Featured image dipilih user, bukan otomatis gambar pertama.

## Milestone 4 — WordPress draft/publish/schedule

Refactor:

- `app/api/publish/wordpress/route.ts`
- `lib/api.ts`
- `components/ResultPanel.tsx`
- tambah helper `lib/wordpress/client.ts`, `media.ts`, dan `posts.ts`

Request publish menggunakan `articleId`, site credential/reference, action (`draft`, `publish`, `schedule`), dan timestamp ber-timezone. Server mengambil artikel terbaru dari database.

Server:

1. Verifikasi ownership dan entitlement.
2. Upload semua WebP ke WordPress Media Library.
3. Ganti URL asset aplikasi dengan URL WordPress.
4. Set media ID yang dipilih sebagai `featured_media`.
5. Create post atau update post yang sama jika `wp_post_id` sudah ada.
6. Simpan status/URL/ID WordPress ke artikel.

Scheduling:

- Input datetime hanya muncul untuk mode schedule.
- Timestamp harus valid, memiliki timezone, dan berada di masa depan.
- Map ke status WordPress `future` dan field waktu yang konsisten dengan timezone situs.

Jangan melakukan upload WordPress langsung dari browser dan jangan fallback ke base64. Gunakan endpoint test connection yang sudah ada, bukan membuat post draft pengujian.

### Acceptance criteria

- Draft, immediate publish, dan future schedule bekerja.
- Semua gambar memakai URL WordPress.
- Featured image benar.
- Publish ulang mengupdate post yang sama.
- Kegagalan upload media menghentikan publish dengan pesan yang jelas.

## Milestone 5 — Mayar dan produk Rp5.000

### Product catalog

Pisahkan katalog billing server-authoritative dari konstanta UI:

- `lib/billing/products.ts`

Tambahkan produk:

```ts
trial_article: {
  type: "one_time",
  amount: 5000,
  articleGrants: 1
}
```

Produk trial hanya dapat dibeli sekali per user dan memberi hak untuk menghasilkan, mengedit, memilih template/upload gambar, serta publish/schedule artikel tersebut. Paket lanjutan tetap dapat memakai sistem kredit/grant yang ditentukan kemudian.

### Payment safety

Refactor:

- `app/api/payment/create/route.ts`
- `lib/settle-payment.ts`
- `app/api/payment/webhook/route.ts`
- `app/api/payment/verify/route.ts`
- `app/api/subscription/renew/route.ts`

Tambahkan RPC `settle_mayar_payment` yang dalam satu transaksi mengunci payment, menerapkan grant/plan, lalu menandai payment paid. Settlement harus aman terhadap webhook dan manual verify yang datang bersamaan.

Perbaikan wajib:

- Server mengambil amount dari katalog; client tidak bisa menentukan harga.
- Amount dari Mayar harus cocok tepat.
- Invoice creation gagal menandai payment `create_failed`.
- Samakan env menjadi `MAYAR_WEBHOOK_SECRET`.
- Jika secret dikonfigurasi, request tanpa token atau token salah ditolak.
- Tetap verifikasi invoice server-to-server ke Mayar.
- UI hanya menampilkan sukses jika settlement benar-benar `credited/granted`.
- Hapus toggle yearly sampai yearly billing benar-benar diimplementasikan.

### Acceptance criteria

- Invoice trial selalu Rp5.000.
- Satu pembayaran memberi tepat satu article grant.
- Webhook ganda atau verify bersamaan tidak menggandakan grant.
- Payment tidak menjadi paid jika grant gagal.
- Trial kedua untuk user sama ditolak.

## Security follow-up before production

- Kredensial WordPress saat ini tersimpan plaintext di localStorage. Untuk production, pindahkan ke penyimpanan server-side terenkripsi dan gunakan `siteId` dari client.
- Semua outbound WordPress URL tetap melewati SSRF validation.
- Sanitasi HTML harus dilakukan server-side sebelum simpan/publish.
- Jangan log API key, WordPress password, raw payment payload sensitif, atau full prompt pengguna.
- Rate-limit generate, payment verify, webhook, upload, dan publish.

## Validation strategy

Tambahkan Vitest dan mock HTTP untuk provider, Mayar, dan WordPress.

Unit/integration tests utama:

- Sonnet sukses tidak memanggil Haiku.
- Sonnet 429/5xx/timeout/kosong memanggil Haiku tepat sekali.
- Error 400/auth/entitlement tidak fallback.
- Pipeline sukses tepat tiga tahap dan metadata tidak masuk body.
- Kegagalan setiap tahap refund tepat sekali.
- Idempotency key sama tidak menagih/membuat artikel dua kali.
- XML escaping dan WebP output setiap preset.
- Upload MIME palsu/terlalu besar ditolak.
- Article ownership, sanitasi, slug, word count, dan conflict 409.
- WordPress draft/publish/future, timezone, media replacement, featured ID, dan update post.
- Mayar amount mismatch, webhook secret, duplicate settlement, dan failed grant rollback.

End-to-end target:

1. Login.
2. Bayar Rp5.000 di Mayar sandbox.
3. Terima satu article grant.
4. Generate artikel dengan tiga tahap.
5. Edit dan refresh; perubahan tetap ada.
6. Preview/pilih preset lalu render WebP.
7. Upload manual dan pilih featured image.
8. Publish sebagai WordPress draft.
9. Edit dan update post yang sama.
10. Schedule ke waktu mendatang.
11. Percobaan artikel kedua ditolak karena grant habis.

Perintah validasi:

```sh
npm run test
npm run lint
npm run build
```

Build membutuhkan environment Supabase valid. Jalankan migrasi pada Supabase lokal/staging sebelum production.

## Implementation order

1. Audit schema Supabase remote dan buat forward migration aman.
2. Provider abstraction + three-stage pipeline + idempotent charge/refund.
3. Article persistence + editor autosave + hide model UI.
4. Static preset gallery + WebP renderer + manual uploads + featured image.
5. WordPress media/publish/schedule berdasarkan article ID.
6. Mayar Rp5.000 + transactional settlement.
7. End-to-end staging test.
8. Matikan AIO/image/bulk legacy dari UI, lalu hapus kode setelah satu siklus verifikasi.
