"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants";
import AppShell from "@/components/AppShell";

interface UserProfil {
  id: string; email: string; plan: string; credits: number;
  credits_used: number; articles_used: number; full_name?: string;
  monthly_word_quota?: number | null; monthly_words_used?: number | null;
  max_words_per_article?: number | null; word_quota_period_ends_at?: string | null;
  plan_expires_at?: string; role?: string; subscription_id?: string; auto_renew?: boolean;
}
interface Article { id: string; title: string; keyword: string; word_count: number; created_at: string; model_id: string; credits_used: number; }

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfil] = useState<UserProfil | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMsg, setRenewMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchProfil = useCallback(async () => {
    const res = await fetch(`/api/user`);
    if (res.ok) setProfil(await res.json());
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setAuthUser(user);
      fetchProfil().then(() => setLoading(false));
      sb.from("articles")
        .select("id, title, keyword, word_count, created_at, model_id, credits_used")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => setArticles(data || []));
    });
  }, []);

  // Cek redirect pembayaran dari Mayar (verify_payment=<paymentId>) atau payment=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payId = params.get("verify_payment");
    if (payId) {
      fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) setRenewMsg({ type: "ok", text: d.alreadyApplied ? "Paket sudah aktif." : "Perpanjangan berhasil! Paket aktif 30 hari lagi." });
          else setRenewMsg({ type: "ok", text: "Pembayaran sedang diproses. Kuota akan diperbarui setelah pembayaran dikonfirmasi." });
          fetchProfil();
        })
        .catch(() => {})
        .finally(() => window.history.replaceState({}, "", "/account"));
    } else if (params.get("payment") === "success") {
      fetchProfil();
      window.history.replaceState({}, "", "/account");
    }
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  const handleRenew = async () => {
    setRenewLoading(true);
    setRenewMsg(null);
    try {
      const res = await fetch("/api/subscription/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect ke halaman pembayaran Mayar
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      setRenewMsg({ type: "err", text: e.message || "Gagal memulai pembayaran" });
      setRenewLoading(false);
    }
  };

  const isAdmin = profile?.role === "admin";
  const isPro = isAdmin || (profile?.plan && profile.plan !== "free");
  const planData = PLANS.find(p => p.id === (profile?.plan || "free"));
  const creditsTotal = isAdmin ? Infinity : (planData?.credits ?? 1);
  const creditsUsed = profile?.credits_used ?? 0;
  const credits = profile?.credits ?? 0;
  const wordQuota = profile?.monthly_word_quota ?? null;
  const wordsUsed = profile?.monthly_words_used ?? 0;
  const wordsRemaining = wordQuota === null ? null : Math.max(0, wordQuota - wordsUsed);
  const progressPct = isAdmin ? 0 : wordQuota !== null
    ? Math.min(100, Math.round((wordsUsed / wordQuota) * 100))
    : Math.min(100, creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0);
  const name = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "—";

  const planColor = isAdmin
    ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"
    : isPro
      ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
      : "text-slate-500 bg-stone-100 border-stone-300";
  const planLabel = isAdmin ? "OWNER" : (profile?.plan || "free").toUpperCase();

  // Subscription expiry info
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const now = new Date();
  const isExpired = !isAdmin && isPro && expiresAt !== null && expiresAt <= now;
  const daysLeft = !isAdmin && expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isWarning = !isAdmin && daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">

        {/* Banner expired */}
        {isExpired && (
          <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-300 font-bold text-sm">Masa aktif paket Anda berakhir</p>
              <p className="text-red-400/70 text-xs mt-0.5">Pembuatan artikel dijeda. Perpanjang paket untuk melanjutkan.</p>
            </div>
            <button onClick={handleRenew} disabled={renewLoading}
              className="flex-shrink-0 bg-red-500 hover:bg-red-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50">
              {renewLoading ? "Memproses..." : "Perpanjang"}
            </button>
          </div>
        )}

        {/* Warning H-7 */}
        {isWarning && !isExpired && (
          <div className="mb-5 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-4">
            <span className="text-2xl">⏰</span>
            <div className="flex-1">
              <p className="text-emerald-800 font-bold text-sm">Paket berakhir dalam {daysLeft} hari</p>
              <p className="text-emerald-700/70 text-xs mt-0.5">Perpanjang sekarang agar akses tidak terputus.</p>
            </div>
            <button onClick={handleRenew} disabled={renewLoading}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition-all disabled:opacity-50">
              {renewLoading ? "Memproses..." : "Perpanjang"}
            </button>
          </div>
        )}

        {renewMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            renewMsg.type === "ok"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            {renewMsg.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Akun</h1>
            <p className="text-slate-500 text-sm">Informasi akun dan riwayat aktivitas</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 border border-stone-200 hover:border-red-500/20 px-4 py-2 rounded-xl transition-all hover:bg-red-500/5">
            ⏏ Keluar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Profil card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0 ${
                isAdmin ? "bg-emerald-500 text-[#0c0e14]" : "bg-emerald-500 text-[#0c0e14]"
              }`}>
                {isAdmin ? "👑" : name[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-slate-900">{name}</h2>
                <p className="text-sm text-slate-500 truncate">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${planColor}`}>
                    {isAdmin && "👑 "}{planLabel}
                  </span>
                  {isAdmin && (
                    <span className="text-xs text-yellow-500/60">Unlimited · Akses penuh selamanya</span>
                  )}
                  {!isAdmin && expiresAt && isPro && (
                    <span className={`text-xs ${isExpired ? "text-red-400" : isWarning ? "text-emerald-700" : "text-slate-500"}`}>
                      {isExpired
                        ? `Expired ${expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`
                        : `Berlaku s/d ${expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`
                      }
                    </span>
                  )}
                </div>
              </div>
              {!isPro && !isAdmin && (
                <Link href="/pricing"
                  className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-all ">
                  Upgrade
                </Link>
              )}
              {isPro && !isAdmin && (
                <button onClick={handleRenew} disabled={renewLoading}
                  className="flex-shrink-0 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-700 hover:bg-emerald-500/5 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50">
                  {renewLoading ? "Memproses..." : "🔄 Perpanjang"}
                </button>
              )}
            </div>

            {/* Subscription detail card (hanya untuk paid non-admin) */}
            {isPro && !isAdmin && (
              <div className={`border rounded-2xl p-5 ${
                isExpired
                  ? "bg-red-500/5 border-red-500/20"
                  : isWarning
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-white border-stone-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-400">Detail paket</h3>
                  {isExpired && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">EXPIRED</span>}
                  {isWarning && !isExpired && <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">H-{daysLeft}</span>}
                  {!isExpired && !isWarning && <span className="text-xs font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">AKTIF</span>}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Paket</p>
                    <p className="text-slate-900 font-semibold">{(profile?.plan || "free").toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Masa berlaku</p>
                    <p className={`font-semibold ${isExpired ? "text-red-400" : isWarning ? "text-emerald-700" : "text-slate-900"}`}>
                      {expiresAt
                        ? expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                  {daysLeft !== null && !isExpired && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Sisa hari</p>
                      <p className={`font-semibold ${isWarning ? "text-emerald-700" : "text-slate-900"}`}>{daysLeft} hari</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-stone-200 flex gap-3">
                  <button onClick={handleRenew} disabled={renewLoading}
                    className={`flex-1 font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                      isExpired
                        ? "bg-red-500 hover:bg-red-400 text-slate-900"
                        : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                    }`}>
                    {renewLoading ? "Memproses..." : isExpired ? "Aktifkan Kembali" : "🔄 Perpanjang 30 Hari"}
                  </button>
                  <Link href="/pricing"
                    className="px-4 py-2.5 border border-stone-300 hover:border-slate-600 text-slate-500 hover:text-slate-900 text-sm font-semibold rounded-xl transition-all text-center">
                    Ganti Paket
                  </Link>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Kata tersisa", value: isAdmin ? "∞" : wordQuota !== null ? wordsRemaining!.toLocaleString("id-ID") : "—", sub: isAdmin ? "akses penuh" : wordQuota !== null ? `dari ${wordQuota.toLocaleString("id-ID")} kata` : "aktifkan paket untuk melihat kuota" },
                { label: "Artikel dibuat", value: String(profile?.articles_used ?? 0), sub: "total artikel" },
                { label: "Kata terpakai", value: isAdmin ? "0" : wordQuota !== null ? wordsUsed.toLocaleString("id-ID") : "—", sub: wordQuota !== null ? "periode ini" : "belum ada kuota aktif" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Credit progress (hanya non-admin) */}
            {!isAdmin && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 font-semibold">Pemakaian kata</span>
                  <span className="text-emerald-700 font-bold">{wordQuota !== null ? `${wordsUsed.toLocaleString("id-ID")} / ${wordQuota.toLocaleString("id-ID")} kata` : "Belum tersedia"}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full transition-all ${progressPct > 80 ? "bg-red-500" : progressPct > 60 ? "bg-emerald-500" : "bg-emerald-500"}`}
                    style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-slate-500">{wordQuota !== null ? `${wordsRemaining!.toLocaleString("id-ID")} kata tersisa pada periode ini` : "Aktifkan paket untuk mendapatkan kuota kata."}</p>
                {(wordQuota !== null ? wordsRemaining === 0 : credits === 0) && (
                  <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <span className="text-red-400 text-sm">⚠️</span>
                    <p className="text-xs text-red-300">Kuota habis — <Link href="/pricing" className="underline font-semibold">pilih paket</Link> untuk lanjutkan</p>
                  </div>
                )}
              </div>
            )}

            {/* Riwayat artikel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">Riwayat artikel</h3>
                <Link href="/documents" className="text-xs text-emerald-700 hover:text-emerald-800 transition-colors">Lihat semua →</Link>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                {articles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <p className="text-2xl">▤</p>
                    <p className="text-slate-500 text-sm">Belum ada artikel</p>
                    <Link href="/dashboard/generate" className="text-emerald-700 text-xs hover:text-emerald-800">Buat artikel pertamamu →</Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {articles.map(a => (
                      <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{a.title || a.keyword || "Tanpa judul"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.keyword && <span className="text-xs text-slate-500 truncate max-w-[120px]">{a.keyword}</span>}
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">{(a.word_count || 0).toLocaleString()} kata</span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">Draf tersimpan</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/settings"
                className="flex items-center justify-center gap-2 border border-stone-300 hover:border-slate-600 text-slate-400 hover:text-slate-900 text-sm font-semibold px-4 py-3 rounded-xl transition-all">
                ⚙️ Pengaturan
              </Link>
              <Link href="/pricing"
                className="flex items-center justify-center gap-2 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-700 hover:bg-emerald-500/5 text-sm font-semibold px-4 py-3 rounded-xl transition-all">
                {isPro && !isAdmin ? "Ganti paket" : "Lihat paket"}
              </Link>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
