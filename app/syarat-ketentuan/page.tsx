import Link from "next/link";

export const metadata = {
  title: "Syarat & Ketentuan — SEOTulis.AI",
  description: "Syarat dan ketentuan penggunaan layanan SEOTulis.AI",
};

export default function SyaratKetentuan() {
  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-300" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Nav */}
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
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Syarat & Ketentuan</h1>
          <p className="text-slate-500 text-sm">Berlaku efektif: 1 Januari 2026 · Terakhir diperbarui: 4 Juni 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Penerimaan Syarat</h2>
            <p>Dengan mengakses atau menggunakan layanan SEOTulis.AI ("Layanan"), Anda menyetujui untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak menyetujui syarat ini, harap hentikan penggunaan Layanan.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Deskripsi Layanan</h2>
            <p>SEOTulis.AI adalah platform berbasis kecerdasan buatan (AI) yang membantu pengguna membuat konten artikel SEO berbahasa Indonesia. Layanan meliputi:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Generator artikel SEO otomatis dengan berbagai model AI</li>
              <li>Generator gambar AI (Starter, Pro, Agency)</li>
              <li>Bulk article generation (Starter, Pro, Agency)</li>
              <li>Integrasi publish langsung ke WordPress</li>
              <li>SEO Checker dan analisis konten</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Akun Pengguna</h2>
            <p>Untuk menggunakan Layanan, Anda harus mendaftar dan membuat akun. Anda bertanggung jawab untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Menjaga kerahasiaan kata sandi akun Anda</li>
              <li>Seluruh aktivitas yang terjadi di bawah akun Anda</li>
              <li>Memberikan informasi yang akurat dan terkini saat registrasi</li>
            </ul>
            <p className="mt-2">Kami berhak menangguhkan atau menghapus akun yang melanggar syarat ini.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Sistem Kredit</h2>
            <p>SEOTulis.AI menggunakan sistem kredit (💎) untuk mengakses fitur generate. Ketentuan kredit:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Setiap generate artikel membutuhkan sejumlah kredit sesuai model AI yang dipilih</li>
              <li>Kredit yang sudah digunakan tidak dapat dikembalikan kecuali terjadi kegagalan teknis dari pihak kami</li>
              <li>Kredit dari paket berbayar berlaku selama 30 hari sejak aktivasi</li>
              <li>Kredit yang tidak terpakai hangus saat paket berakhir</li>
              <li>Kredit gratis dari paket Free tidak diperpanjang otomatis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Kebijakan Refund</h2>
            <p>Kami berkomitmen pada kepuasan pelanggan. Kebijakan refund kami:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li><strong className="text-white">Refund penuh</strong> tersedia dalam 3 hari pertama sejak pembelian, jika Anda belum menggunakan lebih dari 20% kredit paket</li>
              <li><strong className="text-white">Refund parsial</strong> dapat dikonsultasikan jika terjadi gangguan teknis dari pihak kami yang menyebabkan kredit berkurang tidak wajar</li>
              <li>Refund tidak berlaku untuk kredit yang sudah digunakan untuk generate konten</li>
              <li>Ajukan refund melalui email ke <a href="mailto:support@seotulis.ai" className="text-amber-400 hover:underline">support@seotulis.ai</a> dengan menyertakan bukti transaksi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Langganan & Perpanjangan</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Paket berbayar berlaku selama <strong className="text-white">30 hari</strong> sejak tanggal aktivasi</li>
              <li>Perpanjangan tidak dilakukan otomatis — Anda perlu memperpanjang secara manual melalui halaman Akun atau Pricing</li>
              <li>Setelah paket berakhir, akun otomatis turun ke paket Free</li>
              <li>Kredit sisa dari paket yang kadaluwarsa tidak dipindahkan ke periode berikutnya</li>
              <li>Kami mengirim notifikasi email 7 hari sebelum paket berakhir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Pembatasan Penggunaan</h2>
            <p>Anda dilarang menggunakan Layanan untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Membuat konten yang melanggar hukum, menyebarkan hoaks, atau konten berbahaya</li>
              <li>Menyalahgunakan API atau melakukan automated scraping yang berlebihan</li>
              <li>Melakukan reverse engineering atau mengkloning Layanan</li>
              <li>Menjual kembali akses atau kredit kepada pihak ketiga tanpa izin tertulis</li>
              <li>Upaya membobol sistem keamanan atau mengakses data pengguna lain</li>
            </ul>
            <p className="mt-2">Pelanggaran dapat mengakibatkan penangguhan akun tanpa refund.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Kekayaan Intelektual</h2>
            <p>Konten yang dihasilkan oleh Layanan menjadi hak milik Anda. Namun, SEOTulis.AI memiliki hak untuk menggunakan konten yang dihasilkan secara anonim untuk meningkatkan kualitas layanan. Platform, desain, kode, dan merek SEOTulis.AI adalah milik kami dan dilindungi hukum hak cipta.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Batasan Tanggung Jawab</h2>
            <p>SEOTulis.AI tidak bertanggung jawab atas:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Kerugian yang timbul dari konten yang dihasilkan AI (selalu review sebelum publikasi)</li>
              <li>Gangguan layanan yang disebabkan oleh faktor di luar kendali kami (force majeure, gangguan pihak ketiga)</li>
              <li>Kehilangan data akibat kondisi di luar kendali kami</li>
            </ul>
            <p className="mt-2">Tanggung jawab maksimal kami dibatasi pada nilai transaksi terakhir Anda.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Perubahan Syarat</h2>
            <p>Kami dapat memperbarui Syarat & Ketentuan ini sewaktu-waktu. Perubahan signifikan akan dinotifikasikan melalui email. Penggunaan Layanan setelah notifikasi dianggap sebagai penerimaan perubahan.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Hukum yang Berlaku</h2>
            <p>Syarat ini diatur oleh hukum Republik Indonesia. Sengketa diselesaikan melalui musyawarah, atau jika tidak tercapai, melalui pengadilan yang berwenang di Indonesia.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Kontak</h2>
            <p>Pertanyaan mengenai Syarat & Ketentuan ini dapat dikirimkan ke:</p>
            <p className="mt-2"><a href="mailto:support@seotulis.ai" className="text-amber-400 hover:underline">support@seotulis.ai</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800/60 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">© 2026 SEOTulis.AI</p>
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
