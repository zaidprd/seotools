# SEOTulis.AI 🇮🇩

SaaS generator konten SEO Bahasa Indonesia. Generate artikel berkualitas dengan AI lalu auto-publish ke WordPress.

Dibangun dengan **Next.js 14 + TypeScript + Tailwind CSS**.

## ✨ Fitur

- **1-Click Blog Post** — generate artikel SEO lengkap dari keyword
- **Bulk Article Generation** — buat banyak artikel sekaligus
- **Auto-Publish WordPress** — publish langsung via REST API (Application Password)
- **Multi-Model AI** — Gratis (OpenRouter: Mistral, Llama, Gemma) & Premium (Claude Opus, Gemini, GPT)
- **13 Section pengaturan** — Core Settings, Brand Voice, Media Hub, Structure, Outline Editor, Syndication, dll
- **Landing page + Login + Dashboard** lengkap

## 🚀 Cara Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# lalu isi API key di file .env

# 3. Jalankan development server
npm run dev
```

Buka http://localhost:3000

## 🔑 Environment Variables

Edit file `.env`:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx      # untuk Claude Opus (model default premium)
OPENROUTER_API_KEY=sk-or-xxxxx      # untuk model gratis
GOOGLE_API_KEY=xxxxx                # opsional, untuk Gemini
OPENAI_API_KEY=sk-xxxxx             # opsional, untuk GPT
```

> ⚠️ API key disimpan di server (API routes), TIDAK pernah ter-expose ke browser.

## 📁 Struktur

```
app/
  page.tsx                    Landing page
  login/page.tsx              Login & register
  dashboard/page.tsx          Dashboard generator
  api/
    generate/route.ts         Panggil AI (Anthropic/OpenRouter/Google/OpenAI)
    publish/wordpress/route.ts Publish ke WordPress
components/                   Komponen UI (Dashboard, SettingsForm, dll)
lib/                          Constants, prompt builder, API client
```

## 🌐 Publish ke WordPress

1. User buka WP Admin → Users → Profile → **Application Passwords**
2. Buat password baru, copy
3. Di dashboard: Publishing to Website → Sambungkan Situs
4. Masukkan URL, username, application password
5. Uji Koneksi → Simpan → siap publish!

## 📝 TODO untuk Produksi

- [ ] Integrasi auth (NextAuth / Clerk / Supabase) — saat ini login langsung redirect
- [ ] Database untuk simpan dokumen & user (Postgres/Supabase)
- [ ] Sistem kredit/langganan + payment (Midtrans/Xendit untuk Indonesia)
- [ ] Integrasi Sanity (selain WordPress)
- [ ] Generate gambar AI (DALL-E / Stable Diffusion)
- [ ] Rate limiting per user

## 📦 Deploy

Paling mudah ke **Vercel**:
```bash
npm i -g vercel
vercel
```
Jangan lupa set environment variables di dashboard Vercel.
