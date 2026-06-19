"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PLANS, MODELS, FREE_MODEL_ID } from "@/lib/constants";

const FEATURES = [
  { icon: "⚡", title: "Generate 1 Klik", desc: "Dari keyword ke artikel SEO lengkap dalam hitungan menit. Judul, struktur, FAQ, meta description — semua otomatis." },
  { icon: "⊞", title: "Bulk Generation", desc: "Input puluhan topik sekaligus. AI generate 5 pilihan judul per topik, kamu pilih, lalu generate semua sekaligus." },
  { icon: "🖼", title: "Gambar AI Otomatis", desc: "Gambar digenerate dan disisipkan otomatis di posisi yang tepat saat artikel dibuat. Tidak perlu cari gambar manual." },
  { icon: "🌐", title: "Auto-Publish WordPress", desc: "Sambungkan situs WordPress tanpa plugin tambahan. Artikel langsung terkirim dengan format HTML yang benar." },
  { icon: "🇮🇩", title: "Bahasa Indonesia Natural", desc: "Bukan terjemahan kaku. Paham konteks lokal: UMKM, Tokopedia, Shopee, tren dan istilah Indonesia." },
  { icon: "🎯", title: "Optimasi SEO Yoast", desc: "Keyword density, LSI keyword, meta description, struktur heading, paragraf pembuka — semua dioptimasi otomatis." },
  { icon: "💎", title: "Sistem Kredit Fleksibel", desc: "Pilih model AI sesuai kebutuhan. Model murah untuk artikel massal, model premium untuk konten unggulan." },
];

const STEPS = [
  {
    icon: "⌨️",
    n: "01",
    t: "Masukkan Keyword",
    d: "Ketik keyword target. AI langsung suggest 5 judul SEO yang mengandung angka, power word, dan struktur yang terbukti ranking.",
  },
  {
    icon: "🤖",
    n: "02",
    t: "AI Analisis & Tulis",
    d: "Model AI pilihan kamu menulis artikel lengkap — dengan struktur E-E-A-T, keyword density 1-2%, FAQ, dan meta description.",
  },
  {
    icon: "🚀",
    n: "03",
    t: "Publish ke WordPress",
    d: "1 klik langsung publish ke WordPress kamu. Dengan judul, slug, meta description, dan format HTML yang sudah benar.",
  },
];

const TESTIMONIALS = [
  {
    name: "Andi Firmansyah",
    role: "Blogger Teknologi",
    site: "teknotips.id",
    avatar: "AF",
    color: "from-blue-500 to-blue-700",
    text: "Artikel pertama yang saya buat pakai Artikel SEO ranking halaman 1 Google dalam 2 minggu. Keyword density-nya pas, tidak over-optimized seperti tools lain.",
    stars: 5,
  },
  {
    name: "Siti Nurhaliza",
    role: "Pemilik Toko Online",
    site: "batikmodern.co.id",
    avatar: "SN",
    color: "from-rose-500 to-rose-700",
    text: "Saya coba di AI checker — skornya di atas 90% human-written. Bahasa Indonesianya benar-benar natural, tidak kaku seperti terjemahan Google Translate.",
    stars: 5,
  },
  {
    name: "Budi Hartono",
    role: "Digital Marketing Agency",
    site: "growthid.agency",
    avatar: "BH",
    color: "from-emerald-500 to-emerald-700",
    text: "Tim kami bisa handle 50+ klien sekarang. Bulk generation menghemat waktu 80%. Artikel langsung Yoast hijau semua tanpa perlu edit manual.",
    stars: 5,
  },
  {
    name: "Dewi Anggraini",
    role: "Health & Lifestyle Blogger",
    site: "sehatcantik.com",
    avatar: "DA",
    color: "from-purple-500 to-purple-700",
    text: "Yang bikin saya kagum, artikel 1.500 kata selesai dalam 45 detik. Dan strukturnya sudah ada H2, H3, tabel, FAQ — persis yang Google suka.",
    stars: 5,
  },
  {
    name: "Reza Maulana",
    role: "Afiliasi Marketer",
    site: "reviewgadgetid.com",
    avatar: "RM",
    color: "from-amber-500 to-orange-600",
    text: "Traffic organik naik 3x dalam 2 bulan setelah pakai Artikel SEO konsisten. Harganya juga jauh lebih murah dibanding hire content writer.",
    stars: 5,
  },
  {
    name: "Laila Fitria",
    role: "Food Blogger",
    site: "dapurlaila.id",
    avatar: "LF",
    color: "from-teal-500 to-teal-700",
    text: "Auto-publish WordPress-nya magic. Saya set artikel selesai, langsung muncul di blog saya dengan gambar featured image placeholder yang sudah diisi.",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "Apakah artikel terdeteksi AI checker?",
    a: "Artikel yang dihasilkan Artikel SEO dirancang agar natural seperti tulisan manusia. Dalam pengujian internal, skor human-written rata-rata 85-95% di tools seperti Originality.ai dan GPTZero. Namun kami tetap menyarankan review singkat sebelum publish untuk hasil terbaik.",
  },
  {
    q: "Apakah bisa langsung ranking di Google?",
    a: "Artikel SEO mengoptimasi semua faktor on-page SEO: keyword density 1-2%, struktur heading yang benar, paragraf pembuka mengandung keyword, meta description yang menarik, dan konten E-E-A-T. Pengguna beta melaporkan banyak artikel ranking halaman 1-2 dalam 2-4 minggu untuk keyword long-tail.",
  },
  {
    q: "Berapa lama generate 1 artikel?",
    a: "Rata-rata 30-90 detik tergantung panjang artikel dan model AI yang dipilih. Artikel 1.000 kata dengan Gemini 2.5 Flash biasanya selesai dalam 45 detik. Artikel maksimal 2.500 kata sekitar 1-2 menit.",
  },
  {
    q: "Apakah perlu install plugin WordPress?",
    a: "Tidak perlu! Kami menggunakan WordPress REST API yang sudah built-in di semua WordPress modern. Cukup buat Application Password di WP Admin > Users > Profile, masukkan ke Artikel SEO, dan siap publish.",
  },
  {
    q: "Apakah kredit kadaluarsa?",
    a: "Kredit berbayar tidak kadaluarsa. Kredit gratis (1 kredit) juga selamanya dan tidak di-reset. Beli kapan perlu, pakai kapan mau.",
  },
  {
    q: "Model AI mana yang paling bagus untuk blog Indonesia?",
    a: "Untuk blog umum dan SEO konten, Gemini 2.5 Flash (gratis) atau GPT-4.1 Mini (2 💎) adalah sweet spot — kualitas bagus, hemat. Untuk konten premium, landing page, atau artikel kompetitif yang panjang, GPT-4.1 (3 💎) atau GPT-5.4 (5 💎) sangat direkomendasikan.",
  },
  {
    q: "Bisa generate dalam bahasa lain selain Indonesia?",
    a: "Ya! Artikel SEO mendukung 13 bahasa: Indonesia, English (US/UK), Melayu, Jawa, Sunda, Arabic, Spanish, French, German, Japanese, Korean, dan Chinese.",
  },
];

const CLAIMS = [
  { icon: "📊", title: "Keyword density otomatis 1–2%", desc: "Tidak over-optimized, tidak under-optimized. Persis range yang disukai Google." },
  { icon: "✅", title: "Lulus Yoast SEO hijau semua", desc: "Semua indikator Yoast SEO terpenuhi otomatis tanpa perlu edit manual." },
  { icon: "👤", title: "Tidak terdeteksi AI checker", desc: "Skor 85-95% human-written di Originality.ai dan GPTZero." },
  { icon: "🏆", title: "Struktur E-E-A-T disukai Google", desc: "Experience, Expertise, Authoritativeness, Trustworthiness — sudah built-in." },
  { icon: "🗣️", title: "Bahasa Indonesia natural", desc: "Bukan terjemahan Google Translate. Paham konteks dan idiom lokal." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#0c0e14] text-slate-100 min-h-screen" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ─── NAV ─── */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">A</div>
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">Artikel</span><span className="text-amber-400"> SEO</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-400">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#cara" className="hover:text-white transition-colors">Cara Kerja</a>
            <a href="#bukti" className="hover:text-white transition-colors">Bukti</a>
            <a href="#harga" className="hover:text-white transition-colors">Harga</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white px-3 py-2 transition-colors">Masuk</Link>
            <Link href="/login" className="text-sm bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-bold px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-amber-500/25">
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-amber-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/4 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-10 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-5 pt-20 pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8 text-xs text-amber-400/80">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Generator konten SEO #1 untuk blogger Indonesia 🇮🇩
          </div>

          <h1 className="text-5xl md:text-[68px] font-black leading-[1.1] mb-6 tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
            Artikel AI yang Terasa<br />
            <span className="relative">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Seperti Ditulis Manusia
              </span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-3 leading-relaxed">
            Bukan robot writing biasa. Artikel SEO menganalisis konten terbaik di Google,
            lalu menulis artikel yang <span className="text-slate-200 font-semibold">natural, informatif, dan ranking.</span>
          </p>
          <p className="text-sm text-slate-500 mb-10">
            Lulus Yoast SEO • Tidak terdeteksi AI • Bahasa Indonesia natural
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-9 py-4 rounded-xl transition-all hover:scale-[1.03] shadow-2xl shadow-amber-500/30 text-lg">
              Coba Gratis — 1 Artikel Tanpa Kartu Kredit
            </Link>
            <a href="#cara"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl transition-all">
              Lihat Cara Kerja ↓
            </a>
          </div>
          <p className="text-xs text-slate-600">Tidak perlu kartu kredit · Setup dalam 2 menit · Cancel kapan saja</p>
        </div>
      </section>

      {/* ─── TRUST BADGES ─── */}
      <section className="border-y border-slate-800/60 bg-slate-900/20 py-7">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {"★★★★★".split("").map((s, i) => <span key={i} className="text-amber-400 text-base">{s}</span>)}
              </div>
              <span className="font-bold text-white text-sm">4.9/5</span>
              <span className="text-slate-500 text-xs">dari pengguna beta</span>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden md:block" />
            {/* Stats */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-2xl font-black text-amber-400">500+</span>
              <span className="text-slate-400">blogger Indonesia</span>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-2xl font-black text-amber-400">10.000+</span>
              <span className="text-slate-400">artikel dibuat</span>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-2xl font-black text-emerald-400">&lt; 60 dtk</span>
              <span className="text-slate-400">per artikel</span>
            </div>
            <div className="w-px h-6 bg-slate-800 hidden md:block" />
            {/* Platform logos */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 mr-1">Dipakai oleh pengguna di:</span>
              {[
                { label: "WordPress", color: "text-blue-400", icon: "🔵" },
                { label: "Tokopedia", color: "text-emerald-400", icon: "🟢" },
                { label: "Google", color: "text-amber-400", icon: "🔴" },
              ].map(p => (
                <span key={p.label} className={`text-xs font-bold ${p.color} bg-slate-900/60 border border-slate-800 px-2.5 py-1 rounded-md`}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUKTI KUALITAS — Before/After ─── */}
      <section id="bukti" className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            Bukti Kualitas
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
            Lihat Perbedaannya Sendiri
          </h2>
          <p className="text-slate-400">Sama-sama AI — tapi hasilnya berbeda jauh</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* BEFORE */}
          <div className="bg-slate-900/40 border border-red-500/20 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-6">
              <span className="bg-red-500/90 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                ❌ Robot Writing Biasa
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed font-medium">
                "Cara Diet Yang Benar"
              </p>
              <div className="w-full h-px bg-slate-800" />
              <p className="text-slate-500 text-sm leading-loose">
                Artikel ini membahas tentang cara diet. Diet adalah cara untuk menurunkan berat badan. Cara diet yang benar adalah dengan cara makan yang benar. Anda perlu makan dengan benar untuk diet. Diet yang benar membutuhkan cara yang benar...
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">Keyword diulang 8x</span>
                <span className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">Tidak natural</span>
                <span className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">Yoast merah</span>
                <span className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">Terdeteksi AI</span>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="bg-slate-900/40 border border-emerald-500/30 rounded-2xl p-6 relative shadow-xl shadow-emerald-500/5">
            <div className="absolute -top-3 left-6">
              <span className="bg-emerald-500 text-slate-900 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                ✅ Artikel SEO
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <p className="text-slate-200 text-sm leading-relaxed font-semibold">
                "7 Cara Diet yang Terbukti Efektif dan Aman Menurut Ahli Gizi"
              </p>
              <div className="w-full h-px bg-slate-800" />
              <p className="text-slate-300 text-sm leading-loose">
                Menurunkan berat badan tidak selalu harus menyiksa. Faktanya, banyak orang berhasil mencapai berat ideal justru dengan pendekatan yang lebih santai dan berkelanjutan. Dalam panduan ini, kami merangkum <span className="text-amber-400">7 cara diet efektif</span> yang didukung penelitian ilmiah terbaru...
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Keyword natural 1.4%</span>
                <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Engaging opening</span>
                <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Yoast hijau ✓</span>
                <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">91% human score</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPECIFIC CLAIMS ─── */}
      <section className="bg-slate-900/20 border-y border-slate-800/40 py-14">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black" style={{ fontFamily: "Sora,sans-serif" }}>
              Bukan Sekadar Klaim — Ada Datanya
            </h2>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {CLAIMS.map(c => (
              <div key={c.title} className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/20 rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{c.icon}</div>
                <p className="font-bold text-sm text-white mb-1.5 leading-snug">{c.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="cara" className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            Cara Kerja
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
            3 Langkah, Artikel Siap Publish
          </h2>
          <p className="text-slate-400">Dari keyword ke artikel terpublish dalam &lt; 5 menit</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 relative">
          {/* Connector lines */}
          <div className="hidden md:block absolute top-10 left-[33%] right-[33%] h-px bg-gradient-to-r from-amber-500/30 via-amber-500/50 to-amber-500/30" />

          {STEPS.map((s, i) => (
            <div key={s.n} className="bg-slate-900/40 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-7 text-center transition-all hover:-translate-y-1 relative group">
              <div className="relative mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">
                  {s.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0c0e14] border-2 border-amber-500/40 text-amber-400 text-[10px] font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-bold text-xl mb-3" style={{ fontFamily: "Sora,sans-serif" }}>{s.t}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="fitur" className="bg-slate-900/20 border-y border-slate-800/40 py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Fitur
            </span>
            <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
              Semua yang Kamu Butuhkan
            </h2>
            <p className="text-slate-400">Solusi lengkap untuk produksi konten SEO skala besar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-amber-500/10 border border-slate-700 group-hover:border-amber-500/20 flex items-center justify-center text-2xl mb-4 transition-all">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── (disembunyikan sementara) */}

      {/* ─── COMPARISON TABLE ─── */}
      <section className="bg-slate-900/20 border-y border-slate-800/40 py-20">
        <div className="max-w-4xl mx-auto px-5">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Perbandingan
            </span>
            <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
              Kenapa Artikel SEO?
            </h2>
            <p className="text-slate-400">Dibanding menulis manual dan tools AI lain</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/80">
                  <th className="text-left px-5 py-4 text-slate-400 font-semibold">Fitur</th>
                  <th className="px-5 py-4 text-center">
                    <span className="text-amber-400 font-black">Artikel SEO</span>
                  </th>
                  <th className="px-5 py-4 text-center text-slate-400 font-semibold">Nulis Manual</th>
                  <th className="px-5 py-4 text-center text-slate-400 font-semibold">SEOWriting.ai</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Bahasa Indonesia Natural", seo: true, manual: true, other: false },
                  { feature: "Auto-publish WordPress", seo: true, manual: false, other: false },
                  { feature: "Yoast SEO Hijau Otomatis", seo: true, manual: "Tergantung", other: false },
                  { feature: "Generate Gambar AI otomatis", seo: "✅ Berbayar", manual: false, other: "Berbayar mahal" },
                  { feature: "Upload Gambar Manual", seo: "✅ Semua plan", manual: true, other: false },
                  { feature: "Editor artikel built-in", seo: true, manual: true, other: false },
                  { feature: "SEO Checker realtime", seo: true, manual: false, other: false },
                  { feature: "Keyword Density Otomatis", seo: true, manual: false, other: false },
                  { feature: "Generate < 60 detik", seo: true, manual: false, other: "Kadang" },
                  { feature: "Struktur E-E-A-T", seo: true, manual: "Tergantung", other: false },
                  { feature: "Bulk Generation", seo: "✅ Starter+", manual: false, other: false },
                  { feature: "Harga per artikel", seo: "Rp 1.400–5.950", manual: "Rp 50.000+", other: "Rp 3.000+" },
                ].map((row, i) => (
                  <tr key={row.feature} className={`border-t border-slate-800/60 ${i % 2 === 0 ? "bg-slate-900/20" : ""}`}>
                    <td className="px-5 py-3.5 text-slate-300">{row.feature}</td>
                    <td className="px-5 py-3.5 text-center">
                      {typeof row.seo === "boolean"
                        ? (row.seo ? <span className="text-emerald-400 font-bold">✅</span> : <span className="text-red-400">❌</span>)
                        : <span className="text-amber-400 font-semibold text-xs">{row.seo}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {typeof row.manual === "boolean"
                        ? (row.manual ? <span className="text-emerald-400">✅</span> : <span className="text-red-400">❌</span>)
                        : <span className="text-slate-400 text-xs">{row.manual}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {typeof row.other === "boolean"
                        ? (row.other ? <span className="text-emerald-400">✅</span> : <span className="text-red-400">❌</span>)
                        : <span className="text-slate-400 text-xs">{row.other}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 text-center mt-4">*Harga dihitung berdasarkan paket Starter 35 kredit/bulan Rp 49.000. Harga freelance rata-rata Rp 50.000–200.000/artikel.</p>
        </div>
      </section>

      {/* ─── MODEL AI ─── */}
      <section className="max-w-4xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black mb-2" style={{ fontFamily: "Sora,sans-serif" }}>Pilih Model AI Sesuai Kebutuhan</h2>
          <p className="text-slate-400 text-sm">Sistem kredit fleksibel — bayar sesuai kualitas yang kamu butuhkan</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {MODELS.map(m => (
            <div key={m.id} className={`text-center p-4 rounded-xl border transition-all hover:-translate-y-1 ${m.id === FREE_MODEL_ID ? "border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/5" : "border-slate-800 bg-slate-900/40"}`}>
              <p className="text-sm font-bold text-white mb-0.5">{m.label}</p>
              <p className="text-[11px] text-slate-500 mb-2">{m.provider}</p>
              <p className="text-xl font-black text-amber-400">{m.credits} 💎</p>
              {m.id === FREE_MODEL_ID && <p className="text-[10px] text-emerald-400 mt-1">Tersedia gratis</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="harga" className="bg-slate-900/20 border-y border-slate-800/40 py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Harga
            </span>
            <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Harga Transparan</h2>
            <p className="text-slate-400">Mulai gratis, upgrade kapan saja</p>
          </div>
          <div className="grid md:grid-cols-4 gap-5 items-start">
            {PLANS.map(p => (
              <div key={p.id} className={`rounded-2xl border overflow-hidden transition-all ${p.highlight ? "border-amber-500/50 shadow-2xl shadow-amber-500/10 scale-[1.03]" : "border-slate-800"}`}>
                {p.highlight && (
                  <div className="bg-amber-500 text-slate-900 text-center text-[10px] font-black py-1.5 tracking-widest uppercase">
                    Paling Populer
                  </div>
                )}
                <div className={`p-6 ${p.highlight ? "bg-gradient-to-b from-amber-500/10 to-slate-900/60" : "bg-slate-900/40"}`}>
                  <h3 className="font-black text-xl mb-1" style={{ fontFamily: "Sora,sans-serif" }}>{p.name}</h3>
                  <div className="mb-1"><span className="text-2xl font-black">{p.priceLabel}</span><span className="text-slate-500 text-sm">{p.period}</span></div>
                  <p className="text-amber-400 font-bold text-sm mb-4">{p.credits} 💎 kredit {p.id === "free" ? "selamanya" : "/bulan"}</p>
                  <ul className="flex flex-col gap-1.5 mb-5">
                    {p.features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-slate-300"><span className="text-emerald-400 flex-shrink-0">✓</span>{f}</li>)}
                  </ul>
                  <Link href={p.price === 0 ? "/login" : "/pricing"}
                    className={`block text-center font-bold py-2.5 rounded-xl transition-all text-sm ${p.highlight ? "bg-amber-500 hover:bg-amber-400 text-slate-900 hover:shadow-lg hover:shadow-amber-500/25" : "border border-slate-700 hover:border-slate-600 text-slate-200"}`}>
                    {p.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-amber-400 hover:text-amber-300 text-sm underline underline-offset-2">
              Lihat detail lengkap & perbandingan paket →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 mb-3" style={{ fontFamily: "Sora,sans-serif" }}>
            Pertanyaan yang Sering Ditanya
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <div key={i} className={`border rounded-xl overflow-hidden transition-all ${openFaq === i ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-slate-900/30 hover:border-slate-700"}`}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-sm text-white pr-4">{faq.q}</span>
                <span className={`text-amber-400 flex-shrink-0 transition-transform text-lg ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-4xl mx-auto px-5 pb-20">
        <div className="bg-gradient-to-br from-amber-500/15 via-slate-900/60 to-slate-900/80 border border-amber-500/30 rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-amber-400 text-sm font-bold tracking-wide mb-4">🔥 Limited Beta Access</p>
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              Siap Hasilkan Artikel<br />yang Ranking?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Bergabung dengan 500+ blogger Indonesia. 1 artikel gratis sekarang juga — tidak perlu kartu kredit.
            </p>
            <Link href="/login"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-10 py-4 rounded-xl transition-all hover:scale-[1.03] shadow-2xl shadow-amber-500/30 text-lg">
              Coba Gratis Sekarang
            </Link>
            <p className="text-xs text-slate-600 mt-4">Tidak perlu kartu kredit · Setup 2 menit · Cancel kapan saja</p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-800/60 py-12 pb-24 md:pb-12">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">A</div>
                <span className="font-black tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
                  <span className="text-white">Artikel</span><span className="text-amber-400"> SEO</span>
                </span>
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
                <Link href="/tentang-kami" className="hover:text-white transition-colors">Tentang Kami</Link>
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <a href="mailto:support@zaidly.com" className="hover:text-white transition-colors">Afiliasi (30%)</a>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-3">Legal</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
                <Link href="/kebijakan-privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
                <a href="mailto:support@zaidly.com" className="hover:text-white transition-colors">Hubungi Kami</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2026 Artikel SEO · Dibuat untuk blogger Indonesia</p>
            <div className="flex gap-4 text-slate-600 text-sm">
              <a href="https://www.instagram.com/zaidprd" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
              <a href="https://www.tiktok.com/@zaidprd99" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TikTok</a>
              <a href="https://www.youtube.com/@dhodprd" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a>
              <a href="https://www.x.com/zaidprd" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── STICKY CTA BAR ─── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${showSticky ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div className="bg-gradient-to-r from-[#0c0e14]/95 via-amber-950/90 to-[#0c0e14]/95 border-t border-amber-500/30 backdrop-blur-md px-5 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">🔥</span>
              <div>
                <p className="font-bold text-white text-sm">Coba 1 artikel GRATIS sekarang — tanpa kartu kredit</p>
                <p className="text-xs text-slate-400">Bergabung dengan 500+ blogger Indonesia yang sudah pakai Artikel SEO</p>
              </div>
            </div>
            <Link href="/login"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-6 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25 text-sm whitespace-nowrap">
              Mulai Gratis →
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
