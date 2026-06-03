import Link from "next/link";

export const metadata = {
  title: "Kebijakan Privasi — SEOTulis.AI",
  description: "Kebijakan privasi dan perlindungan data pengguna SEOTulis.AI",
};

export default function KebijakanPrivasi() {
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
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Kebijakan Privasi</h1>
          <p className="text-slate-500 text-sm">Berlaku efektif: 1 Januari 2026 · Terakhir diperbarui: 4 Juni 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Pendahuluan</h2>
            <p>SEOTulis.AI ("kami", "kita") menghormati privasi Anda dan berkomitmen melindungi data pribadi yang Anda berikan. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi Anda.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Data yang Kami Kumpulkan</h2>

            <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2">2.1 Data yang Anda Berikan</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-white">Informasi akun:</strong> Alamat email, nama (opsional), foto profil (via Google OAuth)</li>
              <li><strong className="text-white">Data pembayaran:</strong> Informasi transaksi (diproses oleh Midtrans — kami tidak menyimpan data kartu)</li>
              <li><strong className="text-white">Koneksi WordPress:</strong> URL situs, username, dan Application Password (disimpan lokal di browser Anda, tidak di server kami)</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2">2.2 Data yang Dikumpulkan Otomatis</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong className="text-white">Data penggunaan:</strong> Artikel yang dibuat, jumlah kredit yang digunakan, model AI yang dipakai</li>
              <li><strong className="text-white">Data teknis:</strong> Alamat IP, jenis browser, sistem operasi (via Supabase Auth)</li>
              <li><strong className="text-white">Cookie sesi:</strong> Untuk menjaga status login Anda</li>
            </ul>

            <h3 className="text-base font-semibold text-slate-200 mt-4 mb-2">2.3 Konten yang Dihasilkan</h3>
            <p className="text-slate-400">Prompt dan artikel yang dihasilkan mungkin diproses oleh penyedia AI pihak ketiga (Google Gemini, OpenRouter). Lihat kebijakan privasi masing-masing penyedia untuk detail lebih lanjut.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Cara Kami Menggunakan Data</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Menyediakan, mengoperasikan, dan meningkatkan Layanan</li>
              <li>Memproses pembayaran dan mengelola langganan</li>
              <li>Mengirim notifikasi penting (expire paket, perubahan layanan)</li>
              <li>Mencegah penyalahgunaan dan menjaga keamanan platform</li>
              <li>Menganalisis penggunaan secara agregat untuk pengembangan fitur</li>
            </ul>
            <p className="mt-3 text-slate-400">Kami <strong className="text-white">tidak menjual</strong> data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Berbagi Data dengan Pihak Ketiga</h2>
            <p>Data Anda hanya dibagikan kepada:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2 text-slate-400">
              <li><strong className="text-white">Supabase</strong> — penyimpanan database dan autentikasi (server di region Singapore)</li>
              <li><strong className="text-white">Midtrans</strong> — pemrosesan pembayaran (tidak menyimpan data kartu di server kami)</li>
              <li><strong className="text-white">Google (Gemini / Imagen)</strong> — untuk generate teks dan gambar AI</li>
              <li><strong className="text-white">OpenRouter</strong> — untuk routing model AI alternatif</li>
              <li><strong className="text-white">Resend</strong> — pengiriman email notifikasi</li>
            </ul>
            <p className="mt-2">Semua penyedia layanan pihak ketiga terikat perjanjian kerahasiaan dan hanya dapat menggunakan data untuk layanan yang kami minta.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Keamanan Data</h2>
            <p>Kami menerapkan langkah-langkah keamanan industri untuk melindungi data Anda:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Enkripsi data saat transit (HTTPS/TLS)</li>
              <li>Enkripsi data saat istirahat (database Supabase)</li>
              <li>Row Level Security (RLS) — setiap pengguna hanya bisa mengakses data miliknya sendiri</li>
              <li>API keys disimpan sebagai environment variable, tidak pernah di-expose ke client</li>
              <li>Autentikasi via OAuth Google yang aman dengan PKCE</li>
            </ul>
            <p className="mt-2">Namun, tidak ada sistem yang 100% aman. Jika terjadi pelanggaran keamanan, kami akan memberitahu Anda dalam 72 jam.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Penyimpanan & Retensi Data</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Data akun disimpan selama akun aktif</li>
              <li>Riwayat artikel disimpan selama akun aktif dan dapat dihapus oleh Anda</li>
              <li>Data pembayaran disimpan sesuai kewajiban hukum (minimal 5 tahun untuk keperluan perpajakan)</li>
              <li>Setelah penghapusan akun, data dihapus dalam 30 hari</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Hak Pengguna</h2>
            <p>Anda memiliki hak untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li><strong className="text-white">Akses:</strong> Meminta salinan data pribadi Anda</li>
              <li><strong className="text-white">Koreksi:</strong> Memperbarui data yang tidak akurat</li>
              <li><strong className="text-white">Penghapusan:</strong> Meminta penghapusan akun dan data Anda</li>
              <li><strong className="text-white">Portabilitas:</strong> Mengekspor riwayat artikel Anda</li>
              <li><strong className="text-white">Pembatasan:</strong> Membatasi pemrosesan data dalam kondisi tertentu</li>
            </ul>
            <p className="mt-2">Ajukan permintaan melalui <a href="mailto:support@seotulis.ai" className="text-amber-400 hover:underline">support@seotulis.ai</a>. Kami akan merespons dalam 7 hari kerja.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Cookie</h2>
            <p>Kami menggunakan cookie yang diperlukan untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
              <li>Menjaga sesi login Anda (cookie sesi Supabase)</li>
              <li>Preferensi antarmuka</li>
            </ul>
            <p className="mt-2">Kami tidak menggunakan cookie pelacak atau iklan pihak ketiga.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Perubahan Kebijakan</h2>
            <p>Kami dapat memperbarui Kebijakan Privasi ini. Perubahan material akan dinotifikasikan melalui email dan banner di aplikasi. Tanggal "Terakhir diperbarui" di atas akan selalu mencerminkan versi terkini.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Kontak</h2>
            <p>Untuk pertanyaan, permintaan data, atau laporan pelanggaran privasi, hubungi kami di:</p>
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
