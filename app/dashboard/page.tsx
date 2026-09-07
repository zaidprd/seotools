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
    setShowBanner(!localStorage.getItem("artikel_seo_banner_dismissed"));

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
    localStorage.setItem("artikel_seo_banner_dismissed", "1");
    setShowBanner(false);
  };

  const isPro = user?.plan && user.plan !== "free";
  const credits = user?.credits ?? 0;
  const planData = PLANS.find(p => p.id === (user?.plan || "free"));
  const creditsTotal = planData?.credits ?? 1;
  const creditsUsed = user?.credits_used ?? 0;
  const wordsTotal = user?.monthly_word_quota ?? null;
  const wordsUsed = user?.monthly_words_used ?? 0;
  const wordsRemaining = wordsTotal === null ? null : Math.max(0, wordsTotal - wordsUsed);
  const progressPct = wordsTotal
    ? Math.min(100, Math.round((wordsUsed / wordsTotal) * 100))
    : Math.min(100, creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0);
  const name = authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "Pengguna";

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* Payment success toast */}
      {paymentToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-900 rounded-2xl px-5 py-4 shadow-2xl shadow-emerald-500/30 flex items-start gap-3 max-w-sm animate-pulse-once">
          <span className="text-2xl flex-shrink-0">🎉</span>
          <div>
            <p className="font-black text-sm">Pembayaran Berhasil!</p>
            <p className="text-[12px] text-emerald-100 mt-0.5">Paket dan kuota kata sudah diaktifkan. Selamat menulis!</p>
          </div>
          <button onClick={() => setPaymentToast(false)} aria-label="Tutup pemberitahuan" className="ml-2 grid h-11 w-11 flex-shrink-0 place-items-center text-emerald-950 hover:text-slate-900">×</button>
        </div>
      )}

      {/* Welcome Banner */}
      {showBanner && (
        <div className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-5 mb-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -translate-y-10 translate-x-10 blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-amber-700 text-xs font-bold tracking-widest uppercase mb-1">Selamat datang</p>
              <h1 className="text-xl font-black text-slate-900 mb-1" style={{ fontFamily: "Sora,sans-serif" }}>
                Hai, {name}! 👋
              </h1>
              <p className="text-sm text-slate-500">
                {wordsRemaining !== null
                  ? <>Kuota kamu: <span className="text-amber-700 font-bold">{wordsRemaining.toLocaleString("id-ID")} kata</span> tersisa.</>
                  : <>Siap membuat artikel setelah paket atau trial aktif.</>}
                {!isPro && " Lihat pilihan paket untuk mulai."}
              </p>
            </div>
            <button onClick={dismissBanner} aria-label="Tutup sambutan" className="grid h-11 w-11 flex-shrink-0 place-items-center text-slate-600 hover:text-slate-900">×</button>
          </div>
        </div>
      )}

      {/* Mulai bekerja Grid */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-black text-slate-900" style={{ fontFamily: "Sora,sans-serif" }}>Mulai menulis</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/generate"
            className="group bg-white border border-stone-200 hover:border-amber-500/40 rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-shadow">⚡</div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">Tulis satu artikel</h3>
            <p className="text-sm text-slate-500">Masukkan kata kunci, susun draf, lalu tinjau sebelum diterbitkan.</p>
            <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold mt-3">Mulai menulis →</span>
          </Link>

          <Link href="/dashboard/bulk"
            className={`group bg-white border rounded-2xl p-6 transition-all hover:-translate-y-0.5 ${
              isPro ? "border-stone-200 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5" : "border-stone-200 opacity-80"
            }`}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">⊞</div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-slate-900">Penulisan beberapa artikel</h3>
              {!isPro && <span className="text-xs text-amber-700 border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 rounded-full">PRO</span>}
            </div>
            <p className="text-sm text-slate-500">Siapkan beberapa draf dari daftar kata kunci</p>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-3 ${isPro ? "text-blue-400" : "text-slate-500"}`}>
              {isPro ? "Buka penulisan massal →" : "Lihat paket untuk akses →"}
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Articles */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Draf terbaru</h2>
          <Link href="/documents" className="text-xs text-amber-700 hover:text-amber-800 transition-colors">Lihat semua →</Link>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {loadingArticles ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-3xl">📝</p>
              <p className="text-slate-500 text-sm">Belum ada artikel</p>
              <Link href="/dashboard/generate" className="text-amber-700 text-xs hover:text-amber-800">Buat artikel pertamamu →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {articles.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.title || a.keyword || "Tanpa judul"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{a.keyword}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{(a.word_count || 0).toLocaleString()} kata</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/articles/${a.id}`}
                    className="text-xs text-slate-500 group-hover:text-amber-700 border border-transparent group-hover:border-amber-500/20 px-2.5 py-1 rounded-lg transition-all">
                    Editor →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="mb-1 text-xl font-bold text-slate-900">Paket Anda</h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${isPro ? "text-amber-700" : "text-slate-500"}`}>
                {isPro ? (user?.plan || "").toUpperCase() : "GRATIS"}
              </span>
              <span className={`rounded-full border px-2 py-1 text-xs font-bold ${isPro ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-300 bg-white text-slate-600"}`}>
                {isPro ? "AKTIF" : "BELUM AKTIF"}
              </span>
            </div>
          </div>
          {!isPro
            ? <Link href="/pricing" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">Upgrade</Link>
            : <Link href="/account" className="text-xs text-slate-500 hover:text-amber-700 border border-stone-300 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-all">Kelola akun</Link>
          }
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{wordsTotal ? "Pemakaian kata bulan ini" : "Status penggunaan"}</span>
            <span className="text-amber-700 font-semibold">{wordsTotal ? `${wordsUsed.toLocaleString("id-ID")} / ${wordsTotal.toLocaleString("id-ID")} kata` : "Aktifkan paket untuk memulai"}</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${progressPct > 80 ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{wordsRemaining !== null ? `${wordsRemaining.toLocaleString("id-ID")} kata tersisa` : "Trial memberi 1 artikel hingga 2.000 kata"}</p>
        </div>
      </div>
    </div>
  );
}
