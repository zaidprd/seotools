# Artikel SEO ðŸ‡®ðŸ‡©

SaaS generator konten SEO Bahasa Indonesia berbasis AI â€” generate artikel berkualitas, auto-publish ke WordPress.

Dibangun dengan **Next.js 14 + TypeScript + Tailwind CSS + Supabase**.

ðŸŒ Live: [seo.zaidly.com](https://seo.zaidly.com)

## âœ¨ Fitur

- **1-Click Article Generator** â€” generate artikel SEO lengkap dari keyword (judul, struktur H2/H3, FAQ, meta description)
- **Bulk Article Generation** â€” input puluhan keyword sekaligus, AI suggest judul, generate semua sekaligus
- **Ilustrasi SVG AI** â€” generate dan sisipkan ilustrasi SVG otomatis ke dalam artikel
- **Auto-Publish WordPress** â€” publish langsung via WordPress REST API (Application Password, tanpa plugin)
- **Multi-Model AI** â€” GPT-5.4 Mini (gratis), GPT-5.2, GPT-5.4, GPT-5.5 (premium)
- **Sistem Kredit ðŸ’Ž** â€” kredit per artikel sesuai model AI, 3 kredit per gambar SVG
- **SEO Checker** â€” analisis real-time keyword density, heading structure, dll
- **13 Bahasa** â€” Indonesia, English, Melayu, Jawa, Sunda, dll

## ðŸš€ Cara Menjalankan

```bash
npm install
cp .env.example .env
# isi env vars (lihat seksi di bawah)
npm run dev
```

Buka http://localhost:3000

## ðŸ”‘ Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# AI (JoinBareng â€” OpenAI-compatible proxy)
SUMOPOD_BASE_URL=https://ai.sumopod.com/v1
SUMOPOD_API_KEY=sk-xxx

# Payment (Mayar)
MAYAR_API_KEY=xxx
MAYAR_WEBHOOK_SECRET=xxx
```

## ðŸ“ Struktur Penting

```
app/
  page.tsx                        Landing page
  login/page.tsx                  Login & register (Supabase Auth)
  dashboard/                      Dashboard utama
  account/page.tsx                Manajemen akun & paket
  pricing/page.tsx                Halaman harga
  api/
    generate/route.ts             Generate artikel + SVG AI
    generate-svg/route.ts         Generate SVG standalone
    publish/wordpress/route.ts    Publish ke WordPress
    payment/                      Integrasi Mayar
components/
  Dashboard.tsx                   Dashboard UI (single & bulk)
  SettingsForm.tsx                Form pengaturan artikel
  ResultPanel.tsx                 Panel hasil artikel + editor
  WPPanel.tsx                     Panel WordPress
lib/
  constants.ts                    Model AI, plan, kredit
  prompt.ts                       Builder prompt artikel
  wp-sites.ts                     Simpan WP sites ke localStorage
supabase/
  functions/subscription-reminder/ Edge function email reminder
```

## ðŸŒ Publish ke WordPress

1. WP Admin â†’ Users â†’ Profile â†’ Application Passwords â†’ buat password baru
2. Di dashboard Artikel SEO â†’ Publishing â†’ Sambungkan Situs
3. Masukkan URL situs, username, application password
4. Uji Koneksi â†’ Simpan â†’ siap publish

## ðŸ“¦ Deploy

Deploy ke Vercel, set env vars di dashboard Vercel.

```bash
vercel --prod
```

## ðŸ“¬ Kontak

- Email: support@zaidly.com
- Instagram: [@zaidprd](https://www.instagram.com/zaidprd)
- TikTok: [@zaidprd99](https://www.tiktok.com/@zaidprd99)
- YouTube: [@dhodprd](https://www.youtube.com/@dhodprd)
- X: [@zaidprd](https://www.x.com/zaidprd)
