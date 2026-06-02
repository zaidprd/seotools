"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants";
import AppShell from "@/components/AppShell";

interface UserProfile {
  id: string; email: string; plan: string; credits: number;
  credits_used: number; articles_used: number; full_name?: string; plan_expires_at?: string;
}
interface Article { id: string; title: string; keyword: string; word_count: number; created_at: string; model_id: string; credits_used: number; }

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setProfile(await res.json());
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setAuthUser(user);
      fetchProfile(user.id).then(() => setLoading(false));
      sb.from("articles")
        .select("id, title, keyword, word_count, created_at, model_id, credits_used")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .then(({ data }) => setArticles(data || []));
    });
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
  };

  const isPro = profile?.plan && profile.plan !== "free";
  const planData = PLANS.find(p => p.id === (profile?.plan || "free"));
  const creditsTotal = planData?.credits ?? 1;
  const creditsUsed = profile?.credits_used ?? 0;
  const credits = profile?.credits ?? 0;
  const progressPct = Math.min(100, creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0);
  const name = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "—";

  const planColor = isPro ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-slate-400 bg-slate-800 border-slate-700";
  const planLabel = (profile?.plan || "free").toUpperCase();

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto" style={{ fontFamily: "'DM Sans',sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Akun</h1>
            <p className="text-slate-500 text-sm">Informasi akun dan riwayat aktivitas</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/20 px-4 py-2 rounded-xl transition-all hover:bg-red-500/5">
            ⏏ Keluar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Profile card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[#0c0e14] font-black text-2xl flex-shrink-0">
                {name[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white">{name}</h2>
                <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${planColor}`}>{planLabel}</span>
                  {profile?.plan_expires_at && isPro && (
                    <span className="text-xs text-slate-600">
                      berlaku s/d {new Date(profile.plan_expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
              {!isPro && (
                <Link href="/pricing"
                  className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">
                  Upgrade
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Kredit Tersisa", value: `${credits} 💎`, sub: `dari ${creditsTotal} total` },
                { label: "Artikel Dibuat", value: String(profile?.articles_used ?? 0), sub: "total artikel" },
                { label: "Kredit Terpakai", value: String(creditsUsed), sub: "💎 digunakan" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  <p className="text-[10px] text-slate-700">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Credit progress */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400 font-semibold">Pemakaian Kredit</span>
                <span className="text-amber-400 font-bold">{creditsUsed} / {creditsTotal} 💎</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${progressPct > 80 ? "bg-red-500" : progressPct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-slate-600">{credits} kredit tersisa bulan ini</p>
              {credits === 0 && (
                <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  <span className="text-red-400 text-sm">⚠️</span>
                  <p className="text-xs text-red-300">Kredit habis — <Link href="/pricing" className="underline font-semibold">upgrade sekarang</Link> untuk lanjutkan</p>
                </div>
              )}
            </div>

            {/* Riwayat artikel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Riwayat Artikel</h3>
                <Link href="/documents" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">Lihat semua →</Link>
              </div>
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                {articles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <p className="text-2xl">📝</p>
                    <p className="text-slate-500 text-sm">Belum ada artikel</p>
                    <Link href="/dashboard/generate" className="text-amber-400 text-xs hover:text-amber-300">Buat artikel pertamamu →</Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {articles.map(a => (
                      <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-900/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{a.title || a.keyword || "Tanpa judul"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.keyword && <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{a.keyword}</span>}
                            <span className="text-[11px] text-slate-600">·</span>
                            <span className="text-[11px] text-slate-500">{(a.word_count || 0).toLocaleString()} kata</span>
                            <span className="text-[11px] text-slate-600">·</span>
                            <span className="text-[11px] text-amber-500/60">{a.credits_used ?? 1} 💎</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-600 flex-shrink-0">
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
                className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all">
                ⚙️ Settings
              </Link>
              <Link href="/pricing"
                className="flex items-center justify-center gap-2 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 hover:bg-amber-500/5 text-sm font-semibold px-4 py-3 rounded-xl transition-all">
                💎 {isPro ? "Lihat Paket" : "Upgrade Plan"}
              </Link>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
