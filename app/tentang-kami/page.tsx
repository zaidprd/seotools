import Link from "next/link";

export const metadata = {
  title: "Tentang Kami — SEOTulis.AI",
  description: "Tentang SEOTulis.AI — platform generator konten SEO terbaik untuk blogger Indonesia",
};

export default function TentangKami() {
  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-300" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
            <span className="font-black tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
            </span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-white transition-colors">← Kembali</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-2xl">S</div>
          </div>
          <h1 className="text-4xl font-black text-white mb-4" style={{ fontFamily: "Sora,sans-serif" }}>
            Tentang <span className="text-amber-400">SEOTulis</span>.AI
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Platform AI untuk membuat konten SEO Bahasa Indonesia berkualitas tinggi — lebih cepat, lebih konsisten, lebih mudah.
          </p>
        </div>

        {/* Misi */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-white mb-4" style={{ fontFamily: "Sora,sans-serif" }}>Misi Kami</h2>
          <p className="text-slate-400 leading-relaxed mb-4">
            SEOTulis.AI lahir dari satu permasalahan nyata: <strong className="text-white">membuat konten SEO Bahasa Indonesia yang berkualitas itu sulit dan memakan waktu</strong>. Blogger, digital marketer, dan pemilik website sering terjebak antara kualitas tulisan dan kecepatan produksi.
          </p>
          <p className="text-slate-400 leading-relaxed mb-4">
            Kami percaya bahwa teknologi AI dapat menjadi asisten terbaik untuk content creator Indonesia — bukan untuk menggantikan kreativitas manusia, tapi untuk mengakselerasi proses kreatif.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Dengan SEOTulis.AI, Anda bisa fokus pada strategi dan ide, sementara kami membantu menulis struktur artikel yang dioptimasi untuk mesin pencari.
          </p>
        </div>

        {/* Produk */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: "Sora,sans-serif" }}>Apa yang Kami Tawarkan</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "✍️", title: "Generator Artikel SEO", desc: "Buat artikel panjang yang dioptimasi untuk SEO dengan model AI terbaru — GPT-5.x lewat JoinBareng." },
              { icon: "🖼️", title: "Generator Gambar AI", desc: "Buat gambar ilustrasi berkualitas tinggi untuk artikel menggunakan Google Imagen — langsung terintegrasi ke konten." },
              { icon: "📦", title: "Bulk Generation", desc: "Generate puluhan artikel sekaligus dari daftar keyword. Ideal untuk skala besar tanpa bottleneck manual." },
              { icon: "🌐", title: "Integrasi WordPress", desc: "Publish artikel langsung ke situs WordPress Anda dari dalam aplikasi, tanpa copy-paste." },
              { icon: "📊", title: "SEO Checker", desc: "Analisis konten real-time untuk memastikan artikel Anda memenuhi kriteria SEO on-page." },
              { icon: "🤖", title: "Multi-Model AI", desc: "Pilih model AI sesuai kebutuhan dan anggaran — dari model gratis hingga premium dengan kualitas terbaik." },
            ].map(f => (
              <div key={f.title} className="bg-slate-900/30 border border-slate-800 rounded-xl p-5">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-white font-bold mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nilai */}
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-white mb-6" style={{ fontFamily: "Sora,sans-serif" }}>Nilai Kami</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🇮🇩", title: "Lokal & Relevan", desc: "Dibangun khusus untuk kebutuhan konten berbahasa Indonesia dengan konteks lokal yang tepat." },
              { icon: "🔒", title: "Privasi & Keamanan", desc: "Data Anda aman. Kami tidak menjual data, tidak menyimpan kredensial sensitif, dan menggunakan enkripsi end-to-end." },
              { icon: "⚡", title: "Efisiensi Nyata", desc: "Dari riset keyword hingga artikel siap publish dalam menit, bukan jam." },
            ].map(v => (
              <div key={v.title} className="text-center">
                <div className="text-3xl mb-3">{v.icon}</div>
                <h3 className="text-white font-bold mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-white mb-4" style={{ fontFamily: "Sora,sans-serif" }}>Hubungi Kami</h2>
          <p className="text-slate-400 mb-6">Punya pertanyaan, saran, atau masalah teknis? Tim kami siap membantu.</p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-lg">📧</span>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email Support</p>
                <a href="mailto:support@seotulis.ai" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">support@seotulis.ai</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-lg">💬</span>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">WhatsApp</p>
                <a href="https://wa.me/6281274203815" target="_blank" rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                  081274203815
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 text-lg">⏱️</span>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Waktu Respons</p>
                <p className="text-slate-300 font-semibold">1–2 hari kerja</p>
              </div>
            </div>
          </div>
          <a href="https://wa.me/6281274203815" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Chat WhatsApp
          </a>
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-xl font-black text-white mb-4">Siap mulai membuat konten berkualitas?</h2>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">
              Mulai Gratis →
            </Link>
            <Link href="/pricing"
              className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-xl transition-all">
              Lihat Harga
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-8 mt-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© 2026 SEOTulis.AI · Dibuat dengan ❤️ untuk blogger Indonesia 🇮🇩</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
            <Link href="/kebijakan-privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link href="/tentang-kami" className="hover:text-white transition-colors">Tentang Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
