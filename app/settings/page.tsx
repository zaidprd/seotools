"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import { getWPSites, saveWPSites } from "@/lib/wp-sites";
import { WPSite, PLANS } from "@/lib/constants";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UserProfil {
  id: string; email: string; plan: string; credits: number; credits_used: number;
  articles_used: number; plan_expires_at?: string; full_name?: string;
  notif_newsletter?: boolean; notif_article?: boolean;
  monthly_word_quota?: number | null; monthly_words_used?: number | null;
}

const TABS = ["Profil", "Integrasi", "Paket dan pembayaran", "Pemakaian", "Notifikasi"] as const;
type Tab = typeof TABS[number];

export default function PengaturanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Profil");
  const [profile, setProfil] = useState<UserProfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);

  // Profil tab
  const [fullName, setFullName] = useState("");
  const [savingProfil, setSavingProfil] = useState(false);
  const [profileMsg, setProfilMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // WP sites
  const [wpSites, setWpSites] = useState<WPSite[]>([]);
  const [wpForm, setWpForm] = useState({ name: "", url: "", user: "", pass: "" });
  const [testingWp, setTestingWp] = useState(false);
  const [wpMsg, setWpMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Notifications
  const [notifNewsletter, setNotifNewsletter] = useState(false);
  const [notifArticle, setNotifArticle] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  // Usage chart
  const [usageData, setUsageData] = useState<{ date: string; articles: number; credits: number }[]>([]);

  const fetchProfil = useCallback(async (uid: string) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) {
      const data: UserProfil = await res.json();
      setProfil(data);
      setFullName(data.full_name || "");
      setNotifNewsletter(data.notif_newsletter ?? false);
      setNotifArticle(data.notif_article ?? false);
    }
  }, []);

  const fetchUsage = useCallback(async (uid: string) => {
    const sb = createClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await sb.from("articles")
      .select("created_at, credits_used")
      .eq("user_id", uid)
      .gte("created_at", since);
    if (!data) return;
    const byDate: Record<string, { articles: number; credits: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      byDate[key] = { articles: 0, credits: 0 };
    }
    data.forEach(r => {
      const key = new Date(r.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (byDate[key]) { byDate[key].articles++; byDate[key].credits += r.credits_used ?? 1; }
    });
    setUsageData(Object.entries(byDate).map(([date, v]) => ({ date, ...v })));
  }, []);

  useEffect(() => {
    setWpSites(getWPSites());
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setAuthUser(user);
      fetchProfil(user.id).then(() => setLoading(false));
      fetchUsage(user.id);
    });
  }, []);

  const saveProfil = async () => {
    if (!authUser) return;
    setSavingProfil(true);
    const sb = createClient();
    const { error } = await sb.from("users").update({ full_name: fullName }).eq("id", authUser.id);
    setProfilMsg(error ? { type: "err", text: error.message } : { type: "ok", text: "Profil berhasil disimpan!" });
    setSavingProfil(false);
    setTimeout(() => setProfilMsg(null), 3000);
  };

  const updatePassword = async () => {
    if (!newPwd || newPwd.length < 6) { setPwdMsg({ type: "err", text: "Password minimal 6 karakter" }); return; }
    setSavingPwd(true);
    const { error } = await createClient().auth.updateUser({ password: newPwd });
    setPwdMsg(error ? { type: "err", text: error.message } : { type: "ok", text: "Password berhasil diperbarui!" });
    setNewPwd("");
    setSavingPwd(false);
    setTimeout(() => setPwdMsg(null), 3000);
  };

  const testWPConnection = async () => {
    if (!wpForm.url || !wpForm.user || !wpForm.pass) { setWpMsg({ type: "err", text: "Lengkapi semua field" }); return; }
    setTestingWp(true);
    try {
      const cleanUrl = wpForm.url.replace(/\/$/, "");
      // Proxy via server API to avoid CORS
      const r = await fetch("/api/wp/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl, user: wpForm.user, pass: wpForm.pass }),
      });
      const data = await r.json();
      if (r.ok && data.ok) {
        const newSite: WPSite = { id: Date.now(), name: wpForm.name || data.name || cleanUrl, url: cleanUrl, user: wpForm.user, pass: wpForm.pass };
        const updated = [...wpSites, newSite];
        saveWPSites(updated);
        setWpSites(updated);
        setWpForm({ name: "", url: "", user: "", pass: "" });
        setWpMsg({ type: "ok", text: `✓ Terhubung ke ${newSite.name} (${data.name})` });
      } else { setWpMsg({ type: "err", text: data.error || "Koneksi gagal" }); }
    } catch (e: any) { setWpMsg({ type: "err", text: e.message }); }
    setTestingWp(false);
    setTimeout(() => setWpMsg(null), 5000);
  };

  const removeWpSite = (id: number) => {
    const updated = wpSites.filter(s => s.id !== id);
    saveWPSites(updated);
    setWpSites(updated);
  };

  const saveNotifications = async () => {
    if (!authUser) return;
    setSavingNotif(true);
    await createClient().from("users").update({ notif_newsletter: notifNewsletter, notif_article: notifArticle }).eq("id", authUser.id);
    setSavingNotif(false);
  };

  const cancelAccount = async () => {
    if (!window.confirm("Yakin ingin menghapus akun? Semua data akan dihapus permanen.")) return;
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/");
  };

  const isPro = profile?.plan && profile.plan !== "free";
  const planData = PLANS.find(p => p.id === (profile?.plan || "free"));
  const creditsTotal = planData?.credits ?? 1;
  const creditsUsed = profile?.credits_used ?? 0;
  const wordQuota = profile?.monthly_word_quota ?? null;
  const wordsUsed = profile?.monthly_words_used ?? 0;
  const wordsRemaining = wordQuota === null ? null : Math.max(0, wordQuota - wordsUsed);
  const progressPct = wordQuota ? Math.min(100, Math.round((wordsUsed / wordQuota) * 100)) : 0;

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto" style={{ fontFamily: "'DM Sans',sans-serif" }}>
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900" style={{ fontFamily: "Sora,sans-serif" }}>Pengaturan</h1>
          <p className="text-slate-500 text-sm">Kelola profil, integrasi, paket, dan preferensi Anda</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? "bg-amber-500 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">

            {/* ─── PROFILE ─── */}
            {activeTab === "Profil" && (
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nama Lengkap</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className="h-11 w-full bg-white border border-stone-300 text-slate-800 text-sm rounded-xl px-4 focus:outline-none focus:border-amber-500/60 placeholder-stone-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Email</label>
                  <input value={profile?.email || ""} readOnly
                    className="h-11 w-full bg-white border border-stone-200 text-slate-500 text-sm rounded-xl px-4 cursor-not-allowed" />
                </div>
                <button onClick={saveProfil} disabled={savingProfil}
                  className="w-fit bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-60">
                  {savingProfil ? "Menyimpan..." : "Simpan Profil"}
                </button>
                {profileMsg && <p className={`text-sm ${profileMsg.type === "ok" ? "text-emerald-700" : "text-red-400"}`}>{profileMsg.text}</p>}

                <div className="border-t border-stone-200 pt-5">
                  <p className="text-sm font-bold text-slate-900 mb-3">Ubah kata sandi</p>
                  <div className="flex gap-2">
                    <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                      placeholder="Password baru (min 6 karakter)"
                      className="flex-1 bg-white border border-stone-300 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500/60 placeholder-stone-400" />
                    <button onClick={updatePassword} disabled={savingPwd || !newPwd}
                      className="bg-stone-100 hover:bg-slate-700 border border-stone-300 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-40">
                      {savingPwd ? "..." : "Update"}
                    </button>
                  </div>
                  {pwdMsg && <p className={`text-sm mt-2 ${pwdMsg.type === "ok" ? "text-emerald-700" : "text-red-400"}`}>{pwdMsg.text}</p>}
                </div>
              </div>
            )}

            {/* ─── INTEGRASI ─── */}
            {activeTab === "Integrasi" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Situs WordPress</h3>
                  <p className="text-xs text-slate-500 mb-4">Tidak perlu install plugin. Gunakan Kata sandi aplikasi dari WP Admin → Users → Profil.</p>
                  {wpSites.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-4">
                      {wpSites.map(s => (
                        <div key={s.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-4 py-3">
                          <span className="text-blue-400 text-sm">🌐</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500 truncate">{s.url}</p>
                          </div>
                          <button onClick={() => removeWpSite(s.id)} className="text-slate-500 hover:text-red-400 text-xs transition-colors">Hapus</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mb-4">Belum ada situs yang terhubung.</p>
                  )}
                </div>

                <div className="border border-stone-300 rounded-xl p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-slate-700">Tambahkan situs</p>
                  {[
                    { label: "Nama Situs", key: "name", placeholder: "cth: Blog Utama" },
                    { label: "URL WordPress", key: "url", placeholder: "https://blog.example.com" },
                    { label: "Username", key: "user", placeholder: "admin" },
                    { label: "Kata sandi aplikasi", key: "pass", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-semibold text-slate-700 block mb-1">{f.label}</label>
                      <input value={(wpForm as any)[f.key]} onChange={e => setWpForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} type={f.key === "pass" ? "password" : "text"}
                        className="h-11 w-full bg-white border border-stone-300 text-slate-800 text-sm rounded-lg px-3 focus:outline-none focus:border-amber-500/60 placeholder-stone-400" />
                    </div>
                  ))}
                  <button onClick={testWPConnection} disabled={testingWp}
                    className="bg-blue-600 hover:bg-blue-500 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 flex items-center gap-2">
                    {testingWp ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Menguji...</> : "🔗 Uji koneksi dan simpan"}
                  </button>
                  {wpMsg && <p className={`text-sm ${wpMsg.type === "ok" ? "text-emerald-700" : "text-red-400"}`}>{wpMsg.text}</p>}
                </div>
              </div>
            )}

            {/* ─── BILLING ─── */}
            {activeTab === "Paket dan pembayaran" && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Paket Aktif</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${isPro ? "text-amber-700" : "text-slate-500"}`}>
                        {isPro ? profile?.plan?.toUpperCase() : "GRATIS"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${isPro ? "text-emerald-700 border-emerald-800 bg-emerald-950/30" : "text-slate-500 border-stone-300 bg-white"}`}>
                        {isPro ? "AKTIF" : "BELUM AKTIF"}
                      </span>
                    </div>
                    {profile?.plan_expires_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        Berlaku hingga: {new Date(profile.plan_expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => router.push("/pricing")}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">
                    Upgrade
                  </button>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Pemakaian kata</span>
                    <span className="text-amber-700 font-bold">{wordQuota !== null ? `${wordsUsed.toLocaleString("id-ID")} / ${wordQuota.toLocaleString("id-ID")} kata` : "Belum tersedia"}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all ${progressPct > 80 ? "bg-red-500" : progressPct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500">{wordsRemaining !== null ? `${wordsRemaining.toLocaleString("id-ID")} kata tersisa` : "Aktifkan paket untuk melihat kuota kata."}</p>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-slate-900 mb-1">Total Artikel</p>
                  <p className="text-2xl font-black text-amber-700">{profile?.articles_used ?? 0}</p>
                  <p className="text-xs text-slate-500">artikel telah dibuat</p>
                </div>

                <div className="border-t border-stone-200 pt-4">
                  <p className="text-sm font-bold text-slate-900 mb-1">Hapus Akun</p>
                  <p className="text-xs text-slate-500 mb-3">Tindakan ini permanen dan tidak dapat dibatalkan. Semua data akan dihapus.</p>
                  <button onClick={cancelAccount}
                    className="text-red-400 hover:text-red-300 text-sm border border-red-500/20 hover:border-red-500/40 px-4 py-2 rounded-xl transition-all hover:bg-red-500/5">
                    Hapus Akun Saya
                  </button>
                </div>
              </div>
            )}

            {/* ─── PEMAKAIAN ─── */}
            {activeTab === "Pemakaian" && (
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 bg-white p-4">
                    <p className="mb-1 text-sm text-slate-600">Artikel bulan ini</p>
                    <p className="text-2xl font-black text-amber-700">{usageData.reduce((s, d) => s + d.articles, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-4">
                    <p className="mb-1 text-sm text-slate-600">Kata tersisa</p>
                    <p className="text-2xl font-black text-amber-700">{wordsRemaining !== null ? wordsRemaining.toLocaleString("id-ID") : "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Pemakaian 30 Hari Terakhir</p>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={usageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }}
                          tickLine={false} axisLine={false}
                          interval={Math.floor(usageData.length / 6)} />
                        <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: "#ffffff", border: "1px solid #d6d3d1", borderRadius: "8px", fontSize: "12px" }}
                          labelStyle={{ color: "#475569" }}
                          itemStyle={{ color: "#f59e0b" }} />
                        <Line type="monotone" dataKey="articles" stroke="#f59e0b" strokeWidth={2} dot={false} name="Artikel" />

                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-amber-500 inline-block" />Artikel</div>

                  </div>
                </div>
              </div>
            )}

            {/* ─── NOTIFIKASI ─── */}
            {activeTab === "Notifikasi" && (
              <div className="flex flex-col gap-5">
                <p className="text-sm text-slate-500">Kelola preferensi notifikasi email kamu.</p>
                {[
                  { label: "Newsletter & Update Produk", desc: "Info fitur baru, tips SEO, dan promo", val: notifNewsletter, set: setNotifNewsletter },
                  { label: "Email Setelah Artikel Selesai", desc: "Notifikasi saat artikel berhasil digenerate", val: notifArticle, set: setNotifArticle },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{n.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                    </div>
                    <button onClick={() => n.set(!n.val)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${n.val ? "bg-amber-500" : "bg-slate-700"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${n.val ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                ))}
                <button onClick={saveNotifications} disabled={savingNotif}
                  className="w-fit bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-60">
                  {savingNotif ? "Menyimpan..." : "Simpan Preferensi"}
                </button>
                <p className="text-xs text-slate-500">Email notifikasi akan dikirim ke {profile?.email}. Fitur email aktif saat Resend API dikonfigurasi.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
