"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "@/components/marketing/BrandMark";
import PlanCards from "@/components/marketing/PlanCards";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "ok" | "info" | "err"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => { createClient().auth.getUser().then(({ data: { user } }) => setUser(user)); }, []);

  const handleBuy = async (productId: string) => {
    if (!user) { router.push("/login"); return; }
    setLoading(productId);
    try {
      const res = await fetch("/api/payment/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.paymentUrl;
    } catch (e: any) { alert(e.message); setLoading(null); }
  };

  const handleManualVerify = async () => {
    if (!user) { alert("Login dulu"); return; }
    setVerifying(true); setVerifyMsg(null);
    try {
      const res = await fetch("/api/payment/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg({ type: "ok", text: data.alreadyApplied ? "Pembayaran sudah diterapkan sebelumnya." : data.articleGrantsAdded ? "Hak 1 artikel sudah aktif." : "Paket berhasil diaktifkan." });
        setTimeout(() => router.push("/dashboard?payment=success"), 2000);
      } else if (data.error?.includes("Tidak ada pembayaran pending")) {
        setVerifyMsg({ type: "info", text: "Tidak ada transaksi yang sedang menunggu verifikasi." });
      } else setVerifyMsg({ type: "err", text: data.error || "Pembayaran belum lunas. Selesaikan pembayaran lalu coba lagi." });
    } catch (e: any) { setVerifyMsg({ type: "err", text: e.message }); }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-stone-200"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><BrandMark />{user ? <a href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-slate-900">Kembali ke dashboard</a> : <a href="/login" className="text-sm font-bold text-slate-400 hover:text-slate-900">Masuk</a>}</div></header>
      <main>
        <section className="relative overflow-hidden border-b border-stone-200"><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.06)_1px,transparent_1px)] [background-size:48px_48px]" /><div className="relative mx-auto max-w-5xl px-5 py-20 text-center"><p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-800">Harga sederhana, tanpa pilihan model</p><h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-slate-900 sm:text-6xl">Bayar untuk kata yang Anda terbitkan.</h1><p className="mx-auto mt-6 max-w-2xl leading-7 text-slate-500">Mulai dengan satu artikel. Jika cocok, pilih kuota 30 hari sesuai ritme penerbitan Anda.</p></div></section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="mb-12 grid overflow-hidden border border-emerald-500/25 bg-emerald-50 lg:grid-cols-[1.15fr_.85fr]"><div className="p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Langkah paling ringan</p><h2 className="mt-4 text-3xl font-black text-slate-900">Coba 1 artikel lengkap</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">Satu kali per akun. Termasuk target 1.500–2.000 kata, editor, pemeriksaan SEO, preset featured image, dan publikasi WordPress.</p><div className="mt-7 flex items-end gap-2"><strong className="text-4xl text-slate-900">Rp5.000</strong><span className="pb-1 text-xs text-slate-500">sekali bayar</span></div></div><div className="flex flex-col justify-center border-t border-emerald-500/20 bg-emerald-500/5 p-7 sm:p-10 lg:border-l lg:border-t-0"><button onClick={() => handleBuy("trial_article")} disabled={loading === "trial_article"} className="rounded-lg bg-emerald-400 px-5 py-4 font-black text-[#07150f] hover:bg-emerald-300 disabled:opacity-60">{loading === "trial_article" ? "Memproses..." : "Coba 1 Artikel — Rp5.000"}</button><p className="mt-3 text-center text-xs text-slate-500">Pembayaran aman melalui Mayar</p></div></div>

          <div className="mb-9"><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-800">Paket lanjutan</p><h2 className="mt-3 text-3xl font-black text-slate-900">Kuota bulanan yang transparan.</h2><p className="mt-3 text-sm text-slate-500">Estimasi artikel menggunakan panjang 1.500–2.000 kata dan dapat berbeda sesuai kebutuhan draft.</p></div>
          <PlanCards onBuy={handleBuy} loading={loading} />

          <div className="mt-8 grid gap-px border border-stone-200 bg-stone-100 sm:grid-cols-2 lg:grid-cols-4">{[["30 hari","Akses paket berlaku selama 30 hari sejak pembayaran."],["Sisa kuota tetap aman","Saat memperpanjang, sisa kuota dibawa ke periode baru hingga sebesar kuota dasar paket yang dibeli."],["Gambar terpisah","Preset featured image tidak mengurangi kuota kata."],["Otomatis","Konfigurasi penulisan dipilih sistem; Anda tidak perlu memilih model."]].map(([t,d]) => <div key={t} className="bg-white p-5"><p className="font-bold text-slate-900">{t}</p><p className="mt-2 text-xs leading-5 text-slate-500">{d}</p></div>)}</div>

          {user && <details className="mx-auto mt-12 max-w-2xl border border-stone-200 bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-slate-900">Bantuan aktivasi pembayaran</summary><p className="mt-2 text-sm leading-6 text-slate-500">Gunakan pemeriksaan ini hanya jika pembayaran sudah berhasil tetapi paket belum aktif setelah beberapa saat.</p><button onClick={handleManualVerify} disabled={verifying} className="mt-4 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:border-emerald-400/50 disabled:opacity-60">{verifying ? "Sedang memeriksa..." : "Periksa transaksi terakhir"}</button>{verifyMsg && <p className={`mt-3 text-sm ${verifyMsg.type === "ok" ? "text-emerald-700" : verifyMsg.type === "info" ? "text-slate-600" : "text-red-600"}`}>{verifyMsg.text}</p>}</details>}
        </section>

        <section className="border-t border-stone-200 bg-white"><div className="mx-auto grid max-w-5xl gap-10 px-5 py-20 lg:grid-cols-[.7fr_1fr]"><h2 className="text-3xl font-black text-slate-900">Pertanyaan sebelum membeli.</h2><div className="divide-y divide-stone-200 border-y border-stone-200">{[["Metode pembayaran apa yang tersedia?","Pembayaran diproses oleh Mayar. Pilihan yang tampil dapat mencakup QRIS, transfer bank, dompet digital, serta kartu sesuai ketersediaan Mayar."],["Apakah paket berlangganan otomatis?","Tidak. Paket berlaku 30 hari dan Anda dapat memperpanjangnya secara manual."],["Apakah sisa kuota akan hangus?","Tidak jika Anda memperpanjang sebelum atau maksimal 7 hari setelah paket berakhir. Sisa kuota dibawa ke periode baru, dengan batas maksimal sebesar kuota dasar paket baru."],["Bagaimana jika paket belum aktif setelah membayar?","Biasanya aktivasi berjalan otomatis. Jika belum aktif setelah beberapa saat, buka Bantuan aktivasi pembayaran dan periksa transaksi terakhir Anda."],["Apakah jumlah artikel dijamin?","Tidak. Kuota dihitung dalam kata, sehingga jumlah artikel bergantung pada panjang setiap draft."],["Apakah perlu plugin WordPress?","Tidak. Koneksi menggunakan WordPress REST API dan Application Password dari akun WordPress Anda."]].map(([q,a]) => <div key={q} className="py-5"><p className="font-bold text-slate-900">{q}</p><p className="mt-2 text-sm leading-6 text-slate-500">{a}</p></div>)}</div></div></section>
      </main>
      <footer className="border-t border-stone-200 px-5 py-8 text-center text-xs text-slate-500">© 2026 Artikel SEO · Pembayaran diproses melalui Mayar</footer>
    </div>
  );
}
