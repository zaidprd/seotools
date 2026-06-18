"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PLANS, MODELS, FREE_MODEL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");
  const [loading, setLoading] = useState<string|null>(null);
  const [user, setUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "ok"|"err"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const handleBuy = async (planId: string) => {
    if (planId === "free") { router.push("/login"); return; }
    if (!user) { router.push("/login"); return; }
    setLoading(planId);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect ke halaman pembayaran Mayar
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      alert(e.message); setLoading(null);
    }
  };

  // Verifikasi manual pembayaran terakhir yang belum masuk
  const handleManualVerify = async () => {
    if (!user) { alert("Login dulu"); return; }
    setVerifying(true); setVerifyMsg(null);
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg({ type: "ok", text: data.alreadyApplied ? "Paket sudah aktif sebelumnya." : `✅ Berhasil! ${data.creditsAdded} kredit ditambahkan. Redirecting...` });
        setTimeout(() => router.push("/dashboard?payment=success"), 2000);
      } else {
        setVerifyMsg({ type: "err", text: data.error || "Pembayaran belum lunas. Selesaikan pembayaran lalu coba lagi." });
      }
    } catch (e: any) {
      setVerifyMsg({ type: "err", text: e.message });
    }
    setVerifying(false);
  };

  const yearlyDiscount = 0.20;

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14]">S</div>
            <span className="font-black text-lg tracking-tight"><span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span></span>
          </a>
          <div className="flex items-center gap-3">
            {user
              ? <a href="/dashboard" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Dashboard</a>
              : <a href="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Masuk</a>
            }
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: "Sora, sans-serif" }}>Harga Transparan</h1>
          <p className="text-slate-400 mb-6">Bayar sesuai pemakaian. Tidak ada biaya tersembunyi.</p>
          <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${billing==="monthly"?"bg-amber-500 text-slate-900":"text-slate-400 hover:text-white"}`}>
              Bulanan
            </button>
            <button onClick={() => setBilling("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${billing==="yearly"?"bg-amber-500 text-slate-900":"text-slate-400 hover:text-white"}`}>
              Tahunan
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">Hemat 20%</span>
            </button>
          </div>
        </div>

        {/* Sudah bayar tapi kredit belum masuk? */}
        {user && (
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 mb-8 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Sudah bayar tapi kredit belum masuk?</p>
              <p className="text-xs text-slate-500 mt-0.5">Klik tombol di samping untuk memverifikasi pembayaran terakhirmu</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button onClick={handleManualVerify} disabled={verifying}
                className="flex-shrink-0 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-60">
                {verifying ? <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />Memverifikasi...</> : "🔍 Verifikasi Pembayaran"}
              </button>
              {verifyMsg && (
                <p className={`text-[11px] ${verifyMsg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{verifyMsg.text}</p>
              )}
            </div>
          </div>
        )}

        {/* Kredit explanation */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 mb-10 max-w-3xl mx-auto">
          <p className="text-sm font-bold text-white mb-1 text-center">💎 35 Kredit Bisa Buat Berapa Artikel?</p>
          <p className="text-xs text-slate-500 text-center mb-4">Pilih model sesuai kebutuhan — semakin canggih, semakin sedikit artikel per bulan</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MODELS.map(m => {
              const articles = Math.floor(35 / m.credits);
              return (
                <div key={m.id} className={`text-center p-3 rounded-xl border ${m.id===FREE_MODEL_ID?"border-emerald-500/30 bg-emerald-500/5":"border-amber-500/20 bg-slate-900/60"}`}>
                  <p className="text-xs font-semibold text-slate-200 mb-2">{m.label}</p>
                  <p className="font-black text-3xl text-amber-400 leading-none">{articles}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">artikel/bulan</p>
                  <p className="text-[10px] text-slate-600 mt-2 border-t border-slate-800 pt-2">{m.credits} 💎 per artikel</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600 text-center mt-3">Kredit tidak kadaluarsa · Bebas pilih model kapan saja</p>
        </div>

        {/* Plans — single paid plan */}
        <div className="max-w-md mx-auto">
          {PLANS.filter(p => p.id === "starter").map(plan => {
            const price = billing === "yearly" ? Math.round(plan.price * (1 - yearlyDiscount)) : plan.price;
            const priceLabel = `Rp ${price.toLocaleString("id-ID")}`;
            const yearlySave = Math.round(plan.price * 12 * yearlyDiscount);
            return (
              <div key={plan.id} className="rounded-2xl border border-amber-500/50 overflow-hidden shadow-2xl shadow-amber-500/10">
                <div className="bg-amber-500 text-slate-900 text-center text-[11px] font-black py-1.5 tracking-widest uppercase">Satu Paket, Semua Fitur</div>
                <div className="p-7 bg-gradient-to-b from-amber-500/10 to-slate-900/60">
                  <h3 className="font-black text-2xl mb-4 text-center" style={{ fontFamily: "Sora,sans-serif" }}>Paket Aktif</h3>
                  <div className="text-center mb-1">
                    <span className="text-5xl font-black">{priceLabel}</span>
                    <span className="text-slate-500 text-base">/bulan</span>
                  </div>
                  {billing === "yearly" && (
                    <p className="text-[12px] text-emerald-400 text-center mb-2">Hemat Rp {yearlySave.toLocaleString("id-ID")}/tahun</p>
                  )}
                  <div className="flex items-center justify-center gap-2 mb-6 mt-3">
                    <span className="text-3xl font-black text-amber-400">35</span>
                    <span className="text-slate-400 text-sm">💎 kredit/bulan</span>
                  </div>
                  <ul className="flex flex-col gap-2.5 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleBuy(plan.id)} disabled={loading === plan.id}
                    className="w-full font-black py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 transition-all flex items-center justify-center gap-2 text-base">
                    {loading === plan.id
                      ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>Memproses...</>
                      : plan.cta}
                  </button>
                  <p className="text-center text-xs text-slate-500 mt-3">Bayar via QRIS · Transfer Bank · GoPay · OVO · ShopeePay</p>
                </div>
              </div>
            );
          })}
          <div className="text-center mt-5">
            <p className="text-sm text-slate-500">
              Belum yakin?{" "}
              <a href="/login" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                Coba 1 artikel gratis →
              </a>
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8" style={{ fontFamily: "Sora,sans-serif" }}>Pertanyaan Umum</h2>
          {[
            { q: "Apa itu kredit dan 35 kredit itu cukup buat apa?", a: "Kredit adalah satuan pemakaian AI. Setiap artikel yang di-generate memotong kredit sesuai model yang dipilih: Gemini 2.5 Flash = 1 kredit (35 artikel/bln), GPT-5.4 = 3 kredit (11 artikel/bln), Claude Haiku 4.5 = 5 kredit (7 artikel/bln), Claude Sonnet 4.6 = 7 kredit (5 artikel/bln). Bebas campur model setiap saat." },
            { q: "Apakah kredit kadaluarsa?", a: "Kredit akan di-reset setiap awal bulan sesuai siklus langganan. Sisa kredit bulan lalu tidak diakumulasi — jadi usahakan dipakai habis tiap bulan." },
            { q: "Sudah bayar tapi kredit belum masuk?", a: "Klik tombol 'Verifikasi Pembayaran' di atas. Sistem akan mengecek pembayaran terakhirmu ke Mayar dan langsung menambahkan kredit jika sudah lunas." },
            { q: "Bisa berhenti berlangganan kapan saja?", a: "Ya. Karena pembayaran per bulan, kamu cukup tidak memperpanjang bulan berikutnya. Tidak ada kontrak jangka panjang." },
            { q: "Metode pembayaran apa saja?", a: "Lewat Mayar: QRIS, Transfer Bank/Virtual Account (BCA/Mandiri/BNI/BRI), GoPay, OVO, ShopeePay, Dana, dan kartu kredit/debit." },
            { q: "Apakah perlu install plugin WordPress?", a: "Tidak perlu! Kami menggunakan WordPress REST API yang sudah built-in. Cukup buat Application Password di WP Admin." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-slate-800 py-4">
              <p className="font-semibold text-white mb-1">{faq.q}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-slate-800/60 py-8 mt-10">
        <div className="max-w-6xl mx-auto px-5 text-center text-xs text-slate-600">
          © 2026 Artikel SEO · Dibuat untuk blogger Indonesia 🇮🇩
        </div>
      </footer>
    </div>
  );
}
