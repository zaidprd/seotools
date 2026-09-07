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
  const [verifyMsg, setVerifyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
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
      } else setVerifyMsg({ type: "err", text: data.error || "Pembayaran belum lunas. Selesaikan pembayaran lalu coba lagi." });
    } catch (e: any) { setVerifyMsg({ type: "err", text: e.message }); }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-[#0a101b] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <header className="border-b border-slate-800"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><BrandMark />{user ? <a href="/dashboard" className="text-sm font-bold text-slate-300 hover:text-white">Kembali ke dashboard</a> : <a href="/login" className="text-sm font-bold text-slate-300 hover:text-white">Masuk</a>}</div></header>
      <main>
        <section className="relative overflow-hidden border-b border-slate-800"><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.06)_1px,transparent_1px)] [background-size:48px_48px]" /><div className="relative mx-auto max-w-5xl px-5 py-20 text-center"><p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Harga sederhana, tanpa pilihan model</p><h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: "Sora,sans-serif" }}>Bayar untuk kata yang Anda terbitkan.</h1><p className="mx-auto mt-6 max-w-2xl leading-7 text-slate-400">Mulai dengan satu artikel. Jika cocok, pilih kuota 30 hari sesuai ritme penerbitan Anda.</p></div></section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="mb-12 grid overflow-hidden border border-emerald-500/25 bg-[#0d181d] lg:grid-cols-[1.15fr_.85fr]"><div className="p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Langkah paling ringan</p><h2 className="mt-4 text-3xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Coba 1 artikel lengkap</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">Satu kali per akun. Termasuk target 1.500–2.000 kata, editor, pemeriksaan SEO, preset featured image, dan publikasi WordPress.</p><div className="mt-7 flex items-end gap-2"><strong className="text-4xl text-white">Rp5.000</strong><span className="pb-1 text-xs text-slate-500">sekali bayar</span></div></div><div className="flex flex-col justify-center border-t border-emerald-500/20 bg-emerald-500/5 p-7 sm:p-10 lg:border-l lg:border-t-0"><button onClick={() => handleBuy("trial_article")} disabled={loading === "trial_article"} className="rounded-lg bg-emerald-400 px-5 py-4 font-black text-[#07150f] hover:bg-emerald-300 disabled:opacity-60">{loading === "trial_article" ? "Memproses..." : "Coba 1 Artikel — Rp5.000"}</button><p className="mt-3 text-center text-xs text-slate-500">Pembayaran aman melalui Mayar</p></div></div>

          <div className="mb-9"><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Paket lanjutan</p><h2 className="mt-3 text-3xl font-black" style={{ fontFamily: "Sora,sans-serif" }}>Kuota bulanan yang transparan.</h2><p className="mt-3 text-sm text-slate-400">Estimasi artikel menggunakan panjang 1.500–2.000 kata dan dapat berbeda sesuai kebutuhan draft.</p></div>
          <PlanCards onBuy={handleBuy} loading={loading} />

          <div className="mt-8 grid gap-px border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">{[["30 hari","Akses paket berlaku selama 30 hari sejak pembayaran."],["Tanpa rollover","Sisa kuota kata tidak dibawa ke periode selanjutnya."],["Gambar terpisah","Preset featured image tidak mengurangi kuota kata."],["Otomatis","Konfigurasi penulisan dipilih sistem; Anda tidak perlu memilih model."]].map(([t,d]) => <div key={t} className="bg-[#0d1522] p-5"><p className="font-bold text-white">{t}</p><p className="mt-2 text-xs leading-5 text-slate-500">{d}</p></div>)}</div>

          {user && <div className="mx-auto mt-12 max-w-2xl border border-slate-800 bg-slate-900/40 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-bold text-white">Sudah bayar tetapi paket belum aktif?</p><p className="mt-1 text-xs text-slate-500">Minta sistem memeriksa transaksi Mayar terakhir Anda.</p></div><button onClick={handleManualVerify} disabled={verifying} className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-bold text-amber-300 hover:border-amber-400/50 disabled:opacity-60">{verifying ? "Memverifikasi..." : "Verifikasi pembayaran"}</button></div>{verifyMsg && <p className={`mt-3 text-xs ${verifyMsg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{verifyMsg.text}</p>}</div>}
        </section>

        <section className="border-t border-slate-800 bg-[#0d1522]"><div className="mx-auto grid max-w-5xl gap-10 px-5 py-20 lg:grid-cols-[.7fr_1fr]"><h2 className="text-3xl font-black" style={{ fontFamily: "Sora,sans-serif" }}>Pertanyaan sebelum membeli.</h2><div className="divide-y divide-slate-800 border-y border-slate-800">{[["Metode pembayaran apa yang tersedia?","Pembayaran diproses oleh Mayar. Pilihan yang tampil dapat mencakup QRIS, transfer bank, dompet digital, serta kartu sesuai ketersediaan Mayar."],["Apakah paket berlangganan otomatis?","Paket berlaku 30 hari. Anda dapat memperpanjang kembali saat membutuhkan kuota baru."],["Apakah jumlah artikel dijamin?","Tidak. Kuota dihitung dalam kata, sehingga jumlah artikel bergantung pada panjang setiap draft."],["Apakah perlu plugin WordPress?","Tidak. Koneksi menggunakan WordPress REST API dan Application Password dari akun WordPress Anda."]].map(([q,a]) => <div key={q} className="py-5"><p className="font-bold text-white">{q}</p><p className="mt-2 text-sm leading-6 text-slate-400">{a}</p></div>)}</div></div></section>
      </main>
      <footer className="border-t border-slate-800 px-5 py-8 text-center text-xs text-slate-500">© 2026 Artikel SEO · Pembayaran diproses melalui Mayar</footer>
    </div>
  );
}
