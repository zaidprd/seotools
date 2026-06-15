# Artikel SEO 🇮🇩

SaaS generator konten SEO Bahasa Indonesia berbasis AI — generate artikel berkualitas, auto-publish ke WordPress.

Dibangun dengan **Next.js 14 + TypeScript + Tailwind CSS + Supabase**.

🌐 Live: [seo.zaidly.com](https://seo.zaidly.com)

## ✨ Fitur

- **1-Click Article Generator** — generate artikel SEO lengkap dari keyword (judul, struktur H2/H3, FAQ, meta description)
- **Bulk Article Generation** — input puluhan keyword sekaligus, AI suggest judul, generate semua sekaligus
- **Ilustrasi SVG AI** — generate dan sisipkan ilustrasi SVG otomatis ke dalam artikel
- **Auto-Publish WordPress** — publish langsung via WordPress REST API (Application Password, tanpa plugin)
- **Multi-Model AI** — GPT-5.4 Mini (gratis), GPT-5.2, GPT-5.4, GPT-5.5 (premium)
- **Sistem Kredit 💎** — kredit per artikel sesuai model AI, 3 kredit per gambar SVG
- **SEO Checker** — analisis real-time keyword density, heading structure, dll
- **13 Bahasa** — Indonesia, English, Melayu, Jawa, Sunda, dll

## 🚀 Cara Menjalankan

```bash
npm install
cp .env.example .env
# isi env vars (lihat seksi di bawah)
npm run dev
```

Buka http://localhost:3000

## 🔑 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# AI (JoinBareng — OpenAI-compatible proxy)
JOINBARENG_BASE_URL=https://api.joinbareng.com/v1
JOINBARENG_API_KEY=jb-xxx

# Payment (Mayar)
MAYAR_API_KEY=xxx
MAYAR_WEBHOOK_SECRET=xxx
```

## 📁 Struktur Penting

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

## 🌐 Publish ke WordPress

1. WP Admin → Users → Profile → Application Passwords → buat password baru
2. Di dashboard Artikel SEO → Publishing → Sambungkan Situs
3. Masukkan URL situs, username, application password
4. Uji Koneksi → Simpan → siap publish

## 📦 Deploy

Deploy ke Vercel, set env vars di dashboard Vercel.

```bash
vercel --prod
```

## 📬 Kontak

- Email: support@zaidly.com
- Instagram: [@zaidprd](https://www.instagram.com/zaidprd)
- TikTok: [@zaidprd99](https://www.tiktok.com/@zaidprd99)
- YouTube: [@dhodprd](https://www.youtube.com/@dhodprd)
- X: [@zaidprd](https://www.x.com/zaidprd)
