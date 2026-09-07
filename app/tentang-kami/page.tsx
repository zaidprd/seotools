import Link from "next/link";

export const metadata = {
  title: "Tentang Kami — Artikel SEO",
  description: "Tentang Artikel SEO, ruang kerja penulisan untuk penerbit dan bisnis Indonesia.",
};

export default function TentangKami() {
  return (
    <div className="min-h-screen bg-[#f7f4ed] text-slate-700" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <header className="border-b border-stone-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">A</div>
            <span className="font-black tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-slate-900">Artikel</span><span className="text-amber-700"> SEO</span>
            </span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">← Kembali</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-2xl">A</div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4" style={{ fontFamily: "Sora,sans-serif" }}>
            Tentang <span className="text-amber-700">Artikel SEO</span>
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Ruang kerja untuk menyusun, meninjau, dan menerbitkan artikel berbahasa Indonesia dengan proses yang lebih rapi.
          </p>
        </div>

        {/* Misi */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-slate-900 mb-4" style={{ fontFamily: "Sora,sans-serif" }}>Misi Kami</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Artikel SEO lahir dari satu permasalahan nyata: <strong className="text-slate-900">membuat konten SEO Bahasa Indonesia yang berkualitas itu sulit dan memakan waktu</strong>. Blogger, digital marketer, dan pemilik website sering terjebak antara kualitas tulisan dan kecepatan produksi.
          </p>
          <p className="text-slate-600 leading-relaxed mb-4">
            Kami percaya bahwa teknologi AI dapat menjadi asisten terbaik untuk content creator Indonesia — bukan untuk menggantikan kreativitas manusia, tapi untuk mengakselerasi proses kreatif.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Dengan Artikel SEO, Anda bisa fokus pada strategi dan ide, sementara kami membantu menulis struktur artikel yang dioptimasi untuk mesin pencari.
          </p>
        </div>

        {/* Produk */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: "Sora,sans-serif" }}>Apa yang Kami Tawarkan</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "✍️", title: "Ruang tulis terpandu", desc: "Susun artikel panjang dari kata kunci, arahan, dan struktur yang Anda tentukan." },
              { icon: "▧", title: "Gambar utama", desc: "Pilih preset gambar utama dan tinjau tampilannya sebelum artikel diterbitkan." },
              { icon: "▤", title: "Pengelolaan draf", desc: "Simpan, cari, dan lanjutkan penyuntingan artikel dari satu tempat." },
              { icon: "↗", title: "Integrasi WordPress", desc: "Kirim artikel ke situs WordPress yang sudah Anda hubungkan." },
              { icon: "✓", title: "Pemeriksaan SEO", desc: "Tinjau elemen on-page sebagai panduan sebelum artikel diterbitkan." },
              { icon: "Aa", title: "Pilihan editorial", desc: "Atur nada, audiens, keterbacaan, dan tautan sesuai kebutuhan tulisan." },
            ].map(f => (
              <div key={f.title} className="bg-white border border-stone-200 rounded-xl p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-slate-900 font-bold mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nilai */}
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: "Sora,sans-serif" }}>Nilai Kami</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🇮🇩", title: "Lokal & Relevan", desc: "Dibangun khusus untuk kebutuhan konten berbahasa Indonesia dengan konteks lokal yang tepat." },
              { icon: "🔒", title: "Privasi & Keamanan", desc: "Data Anda aman. Kami tidak menjual data, tidak menyimpan kredensial sensitif, dan menggunakan enkripsi end-to-end." },
              { icon: "✦", title: "Proses yang jelas", desc: "Setiap draf tetap dapat ditinjau dan disunting sebelum diterbitkan." },
            ].map(v => (
              <div key={v.title} className="text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-slate-900 font-bold mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-slate-900 mb-4" style={{ fontFamily: "Sora,sans-serif" }}>Hubungi Kami</h2>
          <p className="text-slate-600 mb-6">Punya pertanyaan, saran, atau masalah teknis? Tim kami siap membantu.</p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-amber-700 text-lg">📧</span>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email Support</p>
                <a href="mailto:support@zaidly.com" className="text-amber-700 hover:text-amber-900 font-semibold transition-colors">support@zaidly.com</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-700 text-lg">⏱️</span>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Waktu Respons</p>
                <p className="text-slate-700 font-semibold">1–2 hari kerja</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.instagram.com/zaidprd" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm border border-stone-300">
              Instagram
            </a>
            <a href="https://www.tiktok.com/@zaidprd99" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm border border-stone-300">
              TikTok
            </a>
            <a href="https://www.youtube.com/@dhodprd" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm border border-stone-300">
              YouTube
            </a>
            <a href="https://www.x.com/zaidprd" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-slate-700 text-slate-900 font-semibold px-4 py-2 rounded-xl transition-all text-sm border border-stone-300">
              X / Twitter
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-xl font-black text-slate-900 mb-4">Siap mulai membuat konten berkualitas?</h2>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">
              Mulai menulis →
            </Link>
            <Link href="/pricing"
              className="border border-stone-300 hover:border-slate-500 text-slate-700 hover:text-slate-900 font-semibold px-6 py-3 rounded-xl transition-all">
              Lihat Harga
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-8 mt-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© 2026 Artikel SEO · Dibuat untuk blogger Indonesia</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/syarat-ketentuan" className="hover:text-slate-900 transition-colors">Syarat & Ketentuan</Link>
            <Link href="/kebijakan-privasi" className="hover:text-slate-900 transition-colors">Kebijakan Privasi</Link>
            <Link href="/tentang-kami" className="hover:text-slate-900 transition-colors">Tentang Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
