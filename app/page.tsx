"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/marketing/BrandMark";
import PlanCards from "@/components/marketing/PlanCards";

const workflow = [
  ["01", "Tentukan arah", "Masukkan keyword, judul opsional, panjang artikel, dan brief singkat."],
  ["02", "Tulis dan review", "Dapatkan draft panjang yang siap dibaca, lalu rapikan di editor dengan pemeriksaan SEO."],
  ["03", "Siapkan publikasi", "Pilih featured image, unggah gambar isi bila perlu, lalu kirim ke WordPress."],
];

const benefits = [
  ["Struktur yang enak dibaca", "Heading, paragraf, daftar, FAQ, dan kesimpulan disusun untuk artikel panjang—bukan sekadar menambah kata."],
  ["Tautan tetap terkendali", "Pilih tautan manual atau gunakan sumber terverifikasi. Anda tetap memegang keputusan akhir."],
  ["Review dalam satu layar", "Beralih dari preview ke edit, periksa SEO, salin HTML, atau unduh tanpa memindahkan draft."],
  ["Featured image yang jelas", "Gunakan preset sebagai gambar unggulan. Gambar di dalam artikel tetap ditambahkan secara manual."],
  ["Siap untuk WordPress", "Simpan sebagai draft, terbitkan, atau jadwalkan ke situs yang sudah Anda hubungkan."],
];

const faqs = [
  ["Bagaimana cara mencoba Artikel SEO?", "Anda dapat mencoba satu artikel seharga Rp5.000, satu kali per akun, sebelum memilih paket bulanan."],
  ["Apakah saya harus memilih model penulisan?", "Tidak. Konfigurasi penulisan dipilih otomatis agar alurnya sederhana dan hasil lebih konsisten."],
  ["Berapa artikel yang bisa dibuat?", "Paket dihitung dengan kuota kata. Jumlah artikel bergantung pada panjang tiap draft; estimasi menggunakan rentang 1.500–2.000 kata."],
  ["Apakah kuota dibawa ke bulan berikutnya?", "Tidak. Paket aktif selama 30 hari dan sisa kuota tidak diakumulasikan ke periode berikutnya."],
  ["Bagaimana featured image dihitung?", "Preset featured image tidak mengurangi kuota kata. Gambar isi artikel dapat Anda unggah manual dari editor."],
  ["Apakah artikel pasti masuk halaman pertama?", "Tidak ada alat yang dapat menjamin peringkat. Artikel SEO membantu menyiapkan draft dan elemen on-page untuk Anda review sebelum terbit."],
];

function WorkspacePreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-6xl border border-stone-300 bg-white p-2 shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:p-3">
      <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-500"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Ruang kerja artikel</div>
      <div className="grid min-h-[430px] lg:grid-cols-[290px_1fr_220px]">
        <aside className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Keyword utama</p>
          <div className="mt-2 border border-amber-400/40 bg-amber-400/5 px-3 py-3 text-sm text-slate-900">cara memulai bisnis online</div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Target artikel</p>
          <div className="mt-2 border border-stone-300 px-3 py-3 text-xs text-slate-400">Panjang · 1.500–2.000 kata</div>
          <div className="mt-2 border border-stone-300 px-3 py-3 text-xs text-slate-400">Nada · Profesional hangat</div>
          <button className="mt-5 w-full bg-amber-400 py-3 text-xs font-black text-[#0a101b]">Buat draft artikel</button>
        </aside>
        <main className="bg-[#e9e4d9] p-6 text-[#1d2733] sm:p-9">
          <div className="mx-auto max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">Draft · 1.782 kata</p>
            <h3 className="mt-3 text-2xl font-black leading-tight sm:text-3xl" style={{ fontFamily: "Sora,sans-serif" }}>Cara Memulai Bisnis Online: Panduan Praktis dari Nol</h3>
            <p className="mt-5 text-sm leading-7 text-slate-400">Memulai bisnis online bukan hanya soal membuat akun toko. Anda perlu memilih masalah yang ingin diselesaikan, mengenali calon pembeli, dan membangun proses yang dapat dijalankan secara konsisten.</p>
            <h4 className="mt-7 text-lg font-bold">Mulai dari kebutuhan pasar</h4>
            <div className="mt-3 space-y-2"><span className="block h-2 bg-slate-400/30" /><span className="block h-2 w-11/12 bg-slate-400/30" /><span className="block h-2 w-4/5 bg-slate-400/30" /></div>
          </div>
        </main>
        <aside className="border-t border-stone-200 p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-bold text-slate-900">Kesiapan publikasi</p>
          <div className="mt-5 space-y-4 text-xs text-slate-500">
            <p><span className="mr-2 text-emerald-700">●</span>Struktur heading</p><p><span className="mr-2 text-emerald-700">●</span>Meta description</p><p><span className="mr-2 text-emerald-700">●</span>Tautan direview</p>
          </div>
          <div className="mt-8 border border-stone-300 p-3"><p className="text-xs uppercase tracking-widest text-slate-500">Featured image</p><div className="mt-3 aspect-[1.9] bg-[linear-gradient(135deg,#273449,#172033)] p-3 text-xs font-bold text-amber-800">Preset editorial siap</div></div>
          <p className="mt-5 text-xs font-bold text-emerald-700">✓ WordPress siap</p>
        </aside>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <div className="min-h-screen bg-[#f7f4ed] text-slate-900" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#f7f4ed]/95 backdrop-blur-sm"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><BrandMark /><nav className="hidden gap-7 text-sm text-slate-500 md:flex"><a href="#alur" className="hover:text-slate-900">Alur kerja</a><a href="#fitur" className="hover:text-slate-900">Fitur</a><a href="#harga" className="hover:text-slate-900">Harga</a><a href="#faq" className="hover:text-slate-900">FAQ</a></nav><div className="flex items-center gap-2"><Link href="/login" className="px-3 py-2 text-sm text-slate-400">Masuk</Link><Link href="/pricing" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-black text-[#0a101b] hover:bg-amber-300">Coba Rp5.000</Link></div></div></header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-200"><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.06)_1px,transparent_1px)] [background-size:48px_48px]" /><div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 sm:pt-28"><div className="max-w-4xl"><p className="mb-6 text-xs font-bold uppercase tracking-[0.24em] text-amber-800">Dari keyword ke WordPress</p><h1 className="text-4xl font-black leading-[1.05] tracking-[-0.05em] text-slate-900 sm:text-6xl lg:text-7xl" style={{ fontFamily: "Sora,sans-serif" }}>Satu artikel SEO.<br /><span className="text-slate-500">Satu alur kerja yang tenang.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">Tulis draft 1.500–2.000 kata, review di editor, siapkan featured image, lalu publikasikan ke WordPress—tanpa memilih model atau mengatur hal teknis yang tidak perlu.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/pricing" className="rounded-lg bg-amber-400 px-6 py-3.5 text-center text-sm font-black text-[#0a101b] hover:bg-amber-300">Coba 1 Artikel — Rp5.000</Link><a href="#alur" className="rounded-lg border border-stone-300 px-6 py-3.5 text-center text-sm font-bold text-slate-800 hover:border-slate-500">Lihat alur kerja ↓</a></div><p className="mt-4 text-xs text-slate-500">Satu kali per akun · Tidak perlu paket bulanan untuk mencoba</p></div><WorkspacePreview /></div></section>

        <section id="alur" className="mx-auto max-w-7xl px-5 py-24"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">Alur kerja</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl" style={{ fontFamily: "Sora,sans-serif" }}>Dari ide ke artikel siap terbit.</h2><p className="mt-4 max-w-md leading-7 text-slate-500">Fokus pada keputusan editorial. Artikel SEO menangani alur penulisan dan menempatkan semua langkah review di tempat yang sama.</p></div><ol className="border-t border-stone-200">{workflow.map(([n,t,d]) => <li key={n} className="grid gap-3 border-b border-stone-200 py-7 sm:grid-cols-[60px_180px_1fr]"><span className="font-mono text-sm text-amber-800">{n}</span><strong className="text-slate-900">{t}</strong><p className="text-sm leading-6 text-slate-500">{d}</p></li>)}</ol></div></section>

        <section id="fitur" className="border-y border-stone-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-24"><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Dibuat untuk proses editorial</p><div className="mt-5 grid gap-8 lg:grid-cols-2"><h2 className="text-3xl font-black tracking-tight sm:text-5xl" style={{ fontFamily: "Sora,sans-serif" }}>Cukup canggih untuk membantu.<br /><span className="text-slate-500">Cukup jelas untuk dikendalikan.</span></h2><p className="max-w-xl leading-7 text-slate-500">Bukan kotak hitam yang langsung menerbitkan. Anda mendapat draft, alat review, dan jalur publikasi yang tetap memberi ruang untuk keputusan manusia.</p></div><div className="mt-14 grid gap-px border border-stone-200 bg-stone-100 md:grid-cols-2">{benefits.map(([t,d],i) => <article key={t} className={`bg-white p-7 ${i===4 ? "md:col-span-2" : ""}`}><span className="font-mono text-xs text-amber-800">0{i+1}</span><h3 className="mt-8 text-xl font-bold text-slate-900">{t}</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{d}</p></article>)}</div></div></section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">Cocok jika</p><h2 className="mt-4 text-3xl font-black" style={{ fontFamily: "Sora,sans-serif" }}>Anda perlu menerbitkan dengan konsisten, bukan massal.</h2></div><div className="grid gap-px bg-stone-100 sm:grid-cols-2"><div className="bg-[#f7f4ed] p-6"><p className="font-bold text-emerald-700">Artikel SEO cocok</p><p className="mt-3 text-sm leading-6 text-slate-500">Untuk blogger, UKM, pemilik WordPress, dan agensi yang meninjau satu artikel secara serius sebelum terbit.</p></div><div className="bg-[#f7f4ed] p-6"><p className="font-bold text-slate-400">Mungkin kurang cocok</p><p className="mt-3 text-sm leading-6 text-slate-500">Jika Anda ingin banyak artikel langsung terbit tanpa review, jaminan peringkat, atau proses penyuntingan.</p></div></div></section>

        <section id="harga" className="border-y border-stone-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-24"><div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">Paket 30 hari</p><h2 className="mt-4 text-3xl font-black sm:text-4xl" style={{ fontFamily: "Sora,sans-serif" }}>Pilih ruang kata yang masuk akal.</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Kuota tidak diakumulasikan. Jumlah artikel adalah perkiraan berdasarkan panjang 1.500–2.000 kata.</p></div><PlanCards /><div className="mt-6 flex flex-col justify-between gap-4 border border-emerald-500/20 bg-emerald-500/5 p-5 sm:flex-row sm:items-center"><div><p className="font-bold text-slate-900">Belum yakin memilih paket?</p><p className="mt-1 text-sm text-slate-500">Coba satu artikel lengkap seharga Rp5.000, satu kali per akun.</p></div><Link href="/pricing" className="rounded-lg bg-emerald-400 px-5 py-3 text-center text-sm font-black text-[#07150f] hover:bg-emerald-300">Coba 1 Artikel</Link></div></div></section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-24"><div className="grid gap-12 lg:grid-cols-[.65fr_1fr]"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-800">FAQ</p><h2 className="mt-4 text-3xl font-black" style={{ fontFamily: "Sora,sans-serif" }}>Sebelum mulai menulis.</h2></div><div className="border-t border-stone-200">{faqs.map(([q,a],i) => <div key={q} className="border-b border-stone-200"><button onClick={() => setOpenFaq(openFaq===i?null:i)} className="flex w-full items-center justify-between gap-6 py-5 text-left font-bold text-slate-900 focus:outline-none focus-visible:text-amber-800"><span>{q}</span><span className="text-amber-800">{openFaq===i?"−":"+"}</span></button>{openFaq===i && <p className="pb-6 pr-8 text-sm leading-6 text-slate-500">{a}</p>}</div>)}</div></div></section>

        <section className="border-t border-stone-200"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-20 md:flex-row md:items-center"><h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-5xl" style={{ fontFamily: "Sora,sans-serif" }}>Mulai dari satu keyword. Selesaikan satu artikel.</h2><Link href="/pricing" className="rounded-lg bg-amber-400 px-7 py-4 text-center font-black text-[#0a101b] hover:bg-amber-300">Coba 1 Artikel — Rp5.000</Link></div></section>
      </main>

      <footer className="border-t border-stone-200"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4"><div><BrandMark compact /><p className="mt-4 max-w-xs text-xs leading-5 text-slate-500">Ruang kerja penulisan SEO untuk blogger dan bisnis Indonesia.</p></div><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Produk</p><div className="mt-3 space-y-2 text-sm text-slate-500"><p><a href="#alur">Alur kerja</a></p><p><Link href="/pricing">Harga</Link></p></div></div><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Perusahaan</p><div className="mt-3 space-y-2 text-sm text-slate-500"><p><Link href="/tentang-kami">Tentang kami</Link></p><p><a href="mailto:support@zaidly.com">Hubungi kami</a></p></div></div><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Legal</p><div className="mt-3 space-y-2 text-sm text-slate-500"><p><Link href="/syarat-ketentuan">Syarat & ketentuan</Link></p><p><Link href="/kebijakan-privasi">Kebijakan privasi</Link></p></div></div></div><div className="border-t border-stone-200 px-5 py-5 text-center text-xs text-slate-500">© 2026 Artikel SEO · Dibuat untuk penerbit Indonesia</div></footer>
    </div>
  );
}
