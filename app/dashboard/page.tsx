"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserData, PLANS } from "@/lib/constants";

interface Article { id: string; title: string; keyword: string; word_count: number; created_at: string; model_id: string; }

export default function DashboardHome() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [paymentToast, setPaymentToast] = useState(false);

  const fetchUser = useCallback(async (uid: string) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setUser(await res.json());
  }, []);

  useEffect(() => {
    setShowBanner(!localStorage.getItem("artikelseo_banner_dismissed"));

    // Check payment redirect param (Mayar verify_payment=<id> atau payment=success)
    const params = new URLSearchParams(window.location.search);
    const payId = params.get("verify_payment");
    if (payId) {
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payId }),
      }).catch(() => {}).finally(() => {
        setPaymentToast(true);
        window.history.replaceState({}, "", "/dashboard");
        setTimeout(() => setPaymentToast(false), 6000);
      });
    } else if (params.get("payment") === "success") {
      setPaymentToast(true);
      window.history.replaceState({}, "", "/dashboard");
      setTimeout(() => setPaymentToast(false), 6000);
    }

    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setAuthUser(user);
      fetchUser(user.id);
      sb.from("articles")
        .select("id, title, keyword, word_count, created_at, model_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) => { setArticles(data || []); setLoadingArticles(false); });
    });
  }, []);

  // Payment success: poll user data setiap 2 detik selama 10 detik
  useEffect(() => {
    if (!paymentToast || !authUser) return;
    let count = 0;
    const interval = setInterval(() => {
      fetchUser(authUser.id);
      count++;
      if (count >= 5) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [paymentToast, authUser]);

  const dismissBanner = () => {
    localStorage.setItem("artikelseo_banner_dismissed", "1");
    setShowBanner(false);
  };

  const isPro = user?.plan && user.plan !== "free";
  const credits = user?.credits ?? 0;
  const planData = PLANS.find(p => p.id === (user?.plan || "free"));
  const creditsTotal = planData?.credits ?? 1;
  const creditsUsed = user?.credits_used ?? 0;
  const progressPct = Math.min(100, creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0);
  const name = authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "Pengguna";

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* Payment success toast */}
      {paymentToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white rounded-2xl px-5 py-4 shadow-2xl shadow-emerald-500/30 flex items-start gap-3 max-w-sm animate-pulse-once">
          <span className="text-2xl flex-shrink-0">🎉</span>
          <div>
            <p className="font-black text-sm">Pembayaran Berhasil!</p>
            <p className="text-[12px] text-emerald-100 mt-0.5">Kredit sudah ditambahkan ke akunmu. Selamat berkreasi!</p>
          </div>
          <button onClick={() => setPaymentToast(false)} className="text-emerald-200 hover:text-white text-xs ml-2 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Welcome Banner */}
      {showBanner && (
        <div className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-5 mb-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -translate-y-10 translate-x-10 blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-1">Selamat Datang</p>
              <h1 className="text-xl font-black text-white mb-1" style={{ fontFamily: "Sora,sans-serif" }}>
                Hai, {name}! 👋
              </h1>
              <p className="text-sm text-slate-400">
                Kamu punya <span className="text-amber-400 font-bold">{credits} 💎 kredit</span> tersisa.
                {!isPro && " Upgrade untuk lebih banyak konten."}
              </p>
            </div>
            <button onClick={dismissBanner} className="text-slate-600 hover:text-slate-400 text-xs flex-shrink-0 transition-colors">✕</button>
          </div>
        </div>
      )}

      {/* Tools Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Tools</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/generate"
            className="group bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">⚡</div>
            <h3 className="font-bold text-lg text-white mb-1">1-Click Blog Post</h3>
            <p className="text-sm text-slate-400">Masukkan keyword, AI tulis artikel SEO lengkap dalam &lt; 60 detik</p>
            <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold mt-3">Mulai Generate →</span>
          </Link>

          <Link href="/dashboard/bulk"
            className={`group bg-slate-900/40 border rounded-2xl p-6 transition-all hover:-translate-y-0.5 ${
              isPro ? "border-slate-800 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5" : "border-slate-800 opacity-80"
            }`}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">⊞</div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-white">Bulk Article Generation</h3>
              {!isPro && <span className="text-[10px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded-full">PRO</span>}
            </div>
            <p className="text-sm text-slate-400">Generate puluhan artikel sekaligus dari daftar keyword</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-3 ${isPro ? "text-blue-400" : "text-slate-600"}`}>
              {isPro ? "Mulai Bulk →" : "Upgrade untuk akses →"}
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Dokumen Terakhir</h2>
          <Link href="/documents" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Lihat semua →</Link>
        </div>
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
          {loadingArticles ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-3xl">📝</p>
              <p className="text-slate-500 text-sm">Belum ada artikel</p>
              <Link href="/dashboard/generate" className="text-amber-400 text-xs hover:text-amber-300">Buat artikel pertamamu →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {articles.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-900/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.title || a.keyword || "Tanpa judul"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-slate-500">{a.keyword}</span>
                      <span className="text-[11px] text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">{(a.word_count || 0).toLocaleString()} kata</span>
                      <span className="text-[11px] text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">{new Date(a.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <Link href={`/documents`}
                    className="text-[11px] text-slate-600 group-hover:text-amber-400 border border-transparent group-hover:border-amber-500/20 px-2.5 py-1 rounded-lg transition-all">
                    Editor →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Paket Kamu</h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${isPro ? "text-amber-400" : "text-slate-400"}`}>
                {isPro ? (user?.plan || "").toUpperCase() : "GRATIS"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${isPro ? "text-emerald-400 border-emerald-800 bg-emerald-950/30" : "text-slate-500 border-slate-700 bg-slate-900"}`}>
                {isPro ? "AKTIF" : "FREE TIER"}
              </span>
            </div>
          </div>
          {!isPro
            ? <Link href="/pricing" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">Upgrade</Link>
            : <Link href="/account" className="text-xs text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-all">Kelola Akun</Link>
          }
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Kredit terpakai bulan ini</span>
            <span className="text-amber-400 font-semibold">{creditsUsed} / {creditsTotal} 💎</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${progressPct > 80 ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5">{credits} kredit tersisa</p>
        </div>
      </div>
    </div>
  );
}
