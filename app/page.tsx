import Link from "next/link";
import { PLANS, MODELS, FREE_MODEL_ID } from "@/lib/constants";

const FEATURES = [
  { icon: "⚡", title: "Generate 1 Klik", desc: "Dari keyword ke artikel SEO lengkap dalam hitungan menit. Judul, struktur, FAQ, meta description — semua otomatis." },
  { icon: "⊞", title: "Bulk Generation", desc: "Input puluhan topik sekaligus. AI generate 5 pilihan judul per topik, kamu pilih, lalu generate semua sekaligus." },
  { icon: "🌐", title: "Auto-Publish WordPress", desc: "Sambungkan situs WordPress tanpa plugin tambahan. Artikel langsung terkirim dengan format HTML yang benar." },
  { icon: "🇮🇩", title: "Bahasa Indonesia Natural", desc: "Bukan terjemahan kaku. Paham konteks lokal: UMKM, Tokopedia, Shopee, tren dan istilah Indonesia." },
  { icon: "🎯", title: "Optimasi SEO Yoast", desc: "Keyword density, LSI keyword, meta description, struktur heading, paragraf pembuka — semua dioptimasi otomatis." },
  { icon: "💎", title: "Sistem Kredit Fleksibel", desc: "Pilih model AI sesuai kebutuhan. Model murah untuk artikel massal, model premium untuk konten unggulan." },
];

const STEPS = [
  { n: "1", t: "Masukkan Topik", d: "Ketik keyword atau topik artikel. AI akan suggest 5 pilihan judul SEO yang menarik." },
  { n: "2", t: "Atur & Generate", d: "Pilih model AI, atur panjang, nada, dan struktur. Klik generate — artikel siap dalam < 1 menit." },
  { n: "3", t: "Publish Langsung", d: "Edit seperlunya, lalu publish langsung ke WordPress dengan 1 klik. Atau export ke format apapun." },
];

const TESTIMONIALS = [
  { name: "Andi Pratama", role: "Blogger Teknologi", text: "Dalam 1 jam saya bisa buat 10 artikel yang biasanya butuh seminggu. SEOnya juga bagus, langsung ranking!" },
  { name: "Siti Rahayu", role: "Pemilik Toko Online", text: "Deskripsi produk dan artikel blog jadi jauh lebih mudah. Bahasa Indonesianya natural, tidak kaku seperti terjemahan." },
  { name: "Budi Agency", role: "Digital Marketing Agency", text: "Bulk generation mengubah cara kerja tim kami. Bisa handle 50+ klien dengan konten berkualitas tinggi." },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0c0e14] text-slate-100 min-h-screen" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* Nav */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14]">S</div>
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-400">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#cara" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#harga" className="hover:text-white transition-colors">Harga</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Masuk</Link>
            <Link href="/login" className="text-sm bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-bold px-4 py-2 rounded-lg transition-colors">
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto px-5 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-1.5 mb-8 text-xs text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Generator konten SEO #1 untuk blogger Indonesia
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6" style={{ fontFamily: "Sora,sans-serif" }}>
            Ranking di Google.<br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              Dikutip di AI.
            </span><br />
            Traffic Lebih Banyak.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Platform AI penulis konten SEO Bahasa Indonesia. Generate artikel berkualitas, optimasi untuk Google & AI engine, lalu auto-publish ke WordPress — semua dalam 1 klik.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-xl shadow-amber-500/25 text-lg">
              Mulai Gratis — 1 Artikel Gratis
            </Link>
            <a href="#cara"
              className="border border-slate-700 hover:border-slate-600 text-slate-300 font-bold px-8 py-4 rounded-xl transition-colors">
              Lihat Demo ↓
            </a>
          </div>
          <p className="text-xs text-slate-600">Tidak perlu kartu kredit · 1 artikel gratis selamanya</p>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-800/60 bg-slate-900/20 py-6">
        <div className="max-w-4xl mx-auto px-5 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
          {[
            { n: "10.000+", l: "Artikel dibuat" },
            { n: "500+", l: "Blogger aktif" },
            { n: "4.8/5", l: "Rating pengguna" },
            { n: "< 1 mnt", l: "Per artikel" },
          ].map(s => (
            <div key={s.l}>
              <p className="text-3xl font-black text-amber-400">{s.n}</p>
              <p className="text-sm text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
            Semua yang kamu butuhkan
          </h2>
          <p className="text-slate-400">Solusi lengkap untuk produksi konten SEO skala besar</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model AI section */}
      <section className="bg-slate-900/30 border-y border-slate-800/60 py-16">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ fontFamily: "Sora,sans-serif" }}>Pilih Model AI Sesuai Kebutuhan</h2>
            <p className="text-slate-400 text-sm">Sistem kredit fleksibel — bayar sesuai kualitas yang kamu butuhkan</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {MODELS.map(m => (
              <div key={m.id} className={`text-center p-4 rounded-xl border transition-all hover:-translate-y-1 ${m.id===FREE_MODEL_ID?"border-amber-500/40 bg-amber-500/5":"border-slate-800 bg-slate-900/40"}`}>
                <p className="text-sm font-bold text-white mb-0.5">{m.label}</p>
                <p className="text-[11px] text-slate-500 mb-2">{m.provider}</p>
                <p className="text-xl font-black text-amber-400">{m.credits} 💎</p>
                {m.id === FREE_MODEL_ID && <p className="text-[10px] text-emerald-400 mt-1">Tersedia gratis</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="cara" className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Semudah 1-2-3</h2>
          <p className="text-slate-400">Dari topik ke artikel terpublish dalam hitungan menit</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(s => (
            <div key={s.n} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 text-[#0c0e14] font-black text-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25">{s.n}</div>
              <h3 className="font-bold text-xl mb-2">{s.t}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900/30 border-y border-slate-800/60 py-16">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-black text-center mb-10" style={{ fontFamily: "Sora,sans-serif" }}>Kata Mereka</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-3">{"★★★★★".split("").map((s,i)=><span key={i} className="text-amber-400">{s}</span>)}</div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="harga" className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Harga Transparan</h2>
          <p className="text-slate-400">Mulai gratis, upgrade kapan saja</p>
        </div>
        <div className="grid md:grid-cols-4 gap-5 items-start">
          {PLANS.map(p => (
            <div key={p.id} className={`rounded-2xl p-6 border transition-all ${p.highlight?"bg-gradient-to-b from-amber-500/10 to-slate-900/40 border-amber-500/40 scale-105 shadow-xl shadow-amber-500/10":"bg-slate-900/40 border-slate-800"}`}>
              {p.highlight && <span className="text-[10px] font-black bg-amber-500 text-slate-900 px-3 py-1 rounded-full uppercase tracking-widest block text-center mb-3">Paling Populer</span>}
              <h3 className="font-black text-xl mb-1" style={{ fontFamily: "Sora,sans-serif" }}>{p.name}</h3>
              <div className="mb-2"><span className="text-2xl font-black">{p.priceLabel}</span><span className="text-slate-500 text-sm">{p.period}</span></div>
              <p className="text-amber-400 font-bold text-sm mb-4">{p.credits} 💎 kredit {p.id==="free"?"selamanya":"/bulan"}</p>
              <ul className="flex flex-col gap-1.5 mb-5">
                {p.features.map(f=><li key={f} className="flex items-center gap-2 text-xs text-slate-300"><span className="text-emerald-400">✓</span>{f}</li>)}
              </ul>
              <Link href={p.price===0?"/login":"/pricing"} className={`block text-center font-bold py-2.5 rounded-xl transition-colors text-sm ${p.highlight?"bg-amber-500 hover:bg-amber-400 text-slate-900":"border border-slate-700 hover:border-slate-600 text-slate-200"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/pricing" className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2">
            Lihat detail lengkap & FAQ →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-5 py-16 text-center">
        <div className="bg-gradient-to-br from-amber-500/15 via-slate-900/40 to-slate-900/60 border border-amber-500/30 rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ fontFamily: "Sora,sans-serif" }}>
            Siap buat konten SEO lebih cepat?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Bergabung dengan ratusan blogger dan marketer Indonesia yang sudah menggunakan SEOTulis.AI.
          </p>
          <Link href="/login"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-xl shadow-amber-500/25 text-lg">
            Mulai Gratis Sekarang
          </Link>
          <p className="text-xs text-slate-600 mt-4">1 artikel gratis · Tidak perlu kartu kredit</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-12">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
                <span className="font-black tracking-tight"><span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span></span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Platform generator konten SEO Bahasa Indonesia terbaik untuk blogger dan digital marketer.</p>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-3">Produk</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
                <a href="#cara" className="hover:text-white transition-colors">Cara Kerja</a>
                <Link href="/pricing" className="hover:text-white transition-colors">Harga</Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-3">Perusahaan</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <a href="#" className="hover:text-white transition-colors">Tentang Kami</a>
                <a href="#" className="hover:text-white transition-colors">Blog</a>
                <a href="#" className="hover:text-white transition-colors">Afiliasi (30%)</a>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-3">Legal</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
                <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
                <a href="mailto:support@seotulis.ai" className="hover:text-white transition-colors">Hubungi Kami</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2026 SEOTulis.AI · Dibuat dengan ❤️ untuk blogger Indonesia 🇮🇩</p>
            <div className="flex gap-4 text-slate-600 text-sm">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">YouTube</a>
              <a href="#" className="hover:text-white transition-colors">Telegram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
