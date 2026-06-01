"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PLANS, MODELS, FREE_MODEL_ID } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

declare global { interface Window { snap: any; } }

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");
  const [loading, setLoading] = useState<string|null>(null);
  const [user, setUser] = useState<any>(null);
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
        body: JSON.stringify({ planId, userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => router.push("/dashboard?payment=success"),
          onPending: () => router.push("/dashboard?payment=pending"),
          onError: () => alert("Pembayaran gagal"),
          onClose: () => setLoading(null),
        });
      } else {
        window.location.href = data.redirect_url;
      }
    } catch (e: any) {
      alert(e.message); setLoading(null);
    }
  };

  const yearlyDiscount = 0.20; // 20% off

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14]">S</div>
            <span className="font-black text-lg tracking-tight"><span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span></span>
          </a>
          <div className="flex items-center gap-2">
            {user
              ? <a href="/dashboard" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Dashboard</a>
              : <a href="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Masuk</a>
            }
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: "Sora, sans-serif" }}>Harga Transparan</h1>
          <p className="text-slate-400 mb-6">Bayar sesuai pemakaian. Tidak ada biaya tersembunyi.</p>

          {/* Billing toggle */}
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

        {/* Kredit explanation */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 mb-10 max-w-3xl mx-auto">
          <p className="text-sm font-bold text-white mb-3 text-center">💎 Sistem Kredit — Pilih Model Sesuai Kebutuhan</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {MODELS.map(m => (
              <div key={m.id} className={`text-center p-2.5 rounded-xl border ${m.id===FREE_MODEL_ID?"border-emerald-500/30 bg-emerald-500/5":"border-slate-700 bg-slate-900/60"}`}>
                <p className="text-xs font-semibold text-slate-200 mb-0.5">{m.label}</p>
                <p className="text-[10px] text-slate-500 mb-1">{m.provider}</p>
                <p className="font-black text-amber-400">{m.credits} 💎</p>
                <p className="text-[10px] text-slate-600">per artikel</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 text-center mt-3">Model lebih canggih = kredit lebih banyak terpakai</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-4 gap-5 items-start">
          {PLANS.map(plan => {
            const price = billing === "yearly" && plan.price > 0
              ? Math.round(plan.price * (1 - yearlyDiscount))
              : plan.price;
            const priceLabel = price === 0 ? "Rp 0" : `Rp ${price.toLocaleString("id-ID")}`;

            return (
              <div key={plan.id} className={`rounded-2xl border overflow-hidden transition-all ${plan.highlight?"border-amber-500/50 shadow-xl shadow-amber-500/10 scale-105":"border-slate-800"}`}>
                {plan.highlight && (
                  <div className="bg-amber-500 text-slate-900 text-center text-[11px] font-black py-1.5 tracking-widest uppercase">
                    Paling Populer
                  </div>
                )}
                <div className={`p-6 ${plan.highlight?"bg-gradient-to-b from-amber-500/10 to-slate-900/60":"bg-slate-900/40"}`}>
                  <h3 className="font-black text-xl mb-1" style={{ fontFamily: "Sora,sans-serif" }}>{plan.name}</h3>
                  <div className="mb-1">
                    <span className="text-3xl font-black">{priceLabel}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                  {billing === "yearly" && plan.price > 0 && (
                    <p className="text-[11px] text-emerald-400 mb-1">
                      Hemat Rp {(plan.price * 12 * yearlyDiscount).toLocaleString("id-ID")}/tahun
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="text-2xl font-black text-amber-400">{plan.credits}</span>
                    <span className="text-slate-400 text-sm">💎 kredit {plan.id==="free"?"selamanya":"/bulan"}</span>
                  </div>
                  <ul className="flex flex-col gap-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleBuy(plan.id)} disabled={loading === plan.id}
                    className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                      plan.highlight
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
                        : plan.id==="free"
                          ? "border border-slate-700 hover:border-slate-600 text-slate-200"
                          : "border border-amber-500/30 hover:border-amber-500/60 text-amber-400 hover:bg-amber-500/5"
                    }`}>
                    {loading===plan.id
                      ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>Memproses...</>
                      : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8" style={{ fontFamily: "Sora,sans-serif" }}>Pertanyaan Umum</h2>
          {[
            { q: "Apa itu kredit?", a: "Kredit adalah satuan penggunaan AI. Setiap kali generate artikel, kredit berkurang sesuai model yang dipilih. Gemini Flash-Lite = 1 kredit, GPT-4o = 5 kredit." },
            { q: "Apakah kredit kadaluarsa?", a: "Kredit berbayar tidak kadaluarsa. Kredit gratis (1 kredit) juga selamanya, tapi tidak di-reset." },
            { q: "Bisa ganti paket kapan saja?", a: "Ya, bisa upgrade kapan saja. Kredit langsung ditambahkan setelah pembayaran berhasil." },
            { q: "Metode pembayaran apa saja?", a: "QRIS, Transfer Bank (BCA/Mandiri/BNI/BRI), GoPay, OVO, ShopeePay, Dana, dan kartu kredit/debit." },
            { q: "Apakah perlu install plugin WordPress?", a: "Tidak perlu! Kami menggunakan WordPress REST API yang sudah built-in. Cukup buat Application Password di WP Admin." },
          ].map((faq, i) => (
            <div key={i} className="border-b border-slate-800 py-4">
              <p className="font-semibold text-white mb-1">{faq.q}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 mt-10">
        <div className="max-w-6xl mx-auto px-5 text-center text-xs text-slate-600">
          © 2026 SEOTulis.AI · Dibuat untuk blogger Indonesia 🇮🇩
        </div>
      </footer>
    </div>
  );
}
