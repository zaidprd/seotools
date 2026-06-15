"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODELS, ModelInfo, WPSite, Config, UserData, defaultCfg, FREE_MODEL_ID, FREE_MAX_WORDS, CREDIT_COST } from "@/lib/constants";
import { generateArticle } from "@/lib/api";
import { Sec, Inp, RunBtn, Badge } from "./ui";
import SettingsForm from "./SettingsForm";
import OutlineEditor from "./OutlineEditor";
import ResultPanel from "./ResultPanel";
import WritingLoader from "./WritingLoader";
import { createClient } from "@/lib/supabase/client";

// ─── Generate judul ───────────────────────────────────────────────────────────
async function generateTitles(keyword: string, count = 5): Promise<string[]> {
  const res = await fetch("/api/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `Buat ${count} judul artikel SEO yang menarik dan mengandung keyword "${keyword}". Format: hanya daftar judul, satu per baris, tanpa nomor atau bullet. Bahasa Indonesia.`,
      modelId: FREE_MODEL_ID,
    }),
  });
  const data = await res.json();
  return (data.text || "").split("\n").map((t: string) => t.trim()).filter((t: string) => t.length > 10).slice(0, count);
}

// ─── Upgrade Popup ────────────────────────────────────────────────────────────
function UpgradePopup({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-7 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-4xl mb-3 text-center">💎</div>
        <h3 className="font-black text-xl text-white mb-2 text-center">
          {reason || "Kredit Habis"}
        </h3>
        <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">
          Upgrade untuk terus membuat artikel SEO berkualitas tinggi tanpa batas.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.push("/pricing")}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3 rounded-xl transition-colors">
            Lihat Paket & Harga
          </button>
          <button onClick={onClose} className="w-full text-slate-500 hover:text-slate-300 text-xs py-2 transition-colors">
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SINGLE TAB ───────────────────────────────────────────────────────────────
function SingleTab({ wpSites, addWp, removeWp, user, refreshUser }: {
  wpSites: WPSite[]; addWp: (s: WPSite) => void; removeWp: (id: number) => void;
  user: UserData | null; refreshUser: () => void;
}) {
  const isPro = (user?.plan ?? "free") !== "free";
  const credits = user?.credits ?? 0;
  const defaultModel = MODELS[0];

  const [cfg, setCfg] = useState<Config>(defaultCfg());
  const [model, setModel] = useState<ModelInfo>(defaultModel);
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [outlineRows, setOutlineRows] = useState<{ type: string; text: string }[]>([]);
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [genTitleLoading, setGenTitleLoading] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const cost = CREDIT_COST[model.id] ?? 1;

  const handleGenerateTitle = async () => {
    if (!keyword.trim()) return;
    setGenTitleLoading(true);
    const titles = await generateTitles(keyword);
    setTitleSuggestions(titles);
    setGenTitleLoading(false);
  };

  const generate = async () => {
    if (!keyword.trim()) return;
    if (credits < cost) {
      setUpgradeReason(`Butuh ${cost} 💎 untuk model ini, kamu punya ${credits} 💎`);
      setShowUpgrade(true); return;
    }
    setLoading(true); setResult(null); setError(null);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    try {
      const outline = outlineRows.map(r => `${r.type}: ${r.text}`).join("\n");
      // User gratis: paksa max 1500 kata
      const effectiveCfg = !isPro
        ? { ...cfg, articleSize: FREE_MAX_WORDS }
        : cfg;
      const text = await generateArticle({
        ...effectiveCfg, keyword, title, outline,
        modelId: !isPro ? FREE_MODEL_ID : model.id,
        userId: user?.id,
      } as any);
      setResult(text);
      refreshUser(); // refresh kredit
    } catch (e: any) {
      if (e.message?.includes("Kredit")) { setUpgradeReason(e.message); setShowUpgrade(true); }
      else setError(e.message);
    }
    setLoading(false);
  };

  const currentModel = !isPro
    ? MODELS.find(m => m.id === FREE_MODEL_ID) || defaultModel
    : model;

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {showUpgrade && <UpgradePopup onClose={() => setShowUpgrade(false)} reason={upgradeReason} />}

      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-6 pr-1">
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-900/80 px-4 py-3">
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">1-Click Blog Post</span>
          </div>
          <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-3">
            <Inp label="Keyword Utama *" val={keyword} set={setKeyword} placeholder="cth: cara memulai bisnis online" maxLen={500} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Judul</label>
              <div className="flex gap-1.5">
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kosongkan untuk auto-generate..."
                  className="flex-1 bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-700" />
                <button onClick={handleGenerateTitle} disabled={!keyword.trim() || genTitleLoading} title="Generate judul"
                  className="flex-shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs px-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center">
                  {genTitleLoading ? <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> : "✨"}
                </button>
              </div>
              {titleSuggestions.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-[10px] text-slate-500 mb-1">Pilih judul:</p>
                  {titleSuggestions.map((t, i) => (
                    <button key={i} onClick={() => { setTitle(t); setTitleSuggestions([]); }}
                      className="text-left text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800 px-2 py-1 rounded transition-colors">{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Sec title="Outline Editor" icon="📐">
          <OutlineEditor rows={outlineRows} setRows={setOutlineRows} />
        </Sec>

        <SettingsForm cfg={cfg} set={setCfg} model={currentModel} setModel={setModel}
          wpSites={wpSites} addWp={addWp} removeWp={removeWp}
          wpSel={wpSel} setWpSel={setWpSel} mode="single"
          credits={credits} isPro={isPro} />

        <RunBtn onClick={generate} loading={loading}
          disabled={!keyword.trim() || credits < cost}
          label={`Buat Artikel (${cost} 💎)`} sublabel="Membuat..." />

        {credits === 0 && (
          <button onClick={() => setShowUpgrade(true)}
            className="w-full py-2 text-[11px] text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/5 transition-colors">
            💎 Kredit habis — Upgrade sekarang
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" ref={resultRef}>
        {!result && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">⚡</div>
            <div>
              <p className="text-slate-400 text-sm font-semibold">Siap membuat artikel SEO</p>
              <p className="text-slate-700 text-xs mt-1">Masukkan keyword → konfigurasi → klik Buat Artikel</p>
            </div>
          </div>
        )}
        {loading && <WritingLoader />}
        {error && <div className="flex-1 flex items-center justify-center"><div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm max-w-md">✗ {error}</div></div>}
        {result && <ResultPanel content={result} keyword={keyword} model={currentModel} wpSites={wpSel ? [wpSel] : wpSites} synds={cfg.synds} />}
      </div>
    </div>
  );
}

// ─── BULK ROW ─────────────────────────────────────────────────────────────────
interface BulkRow { topic: string; titles: string[]; selectedTitle: string; keywords: string; }
interface BulkResult extends BulkRow { status: "idle"|"genTitles"|"loading"|"selesai"|"error"; content: string; }

function BulkRowCard({ row, index, onSelectTitle, onRegenTitles, onKeywordsChange }: {
  row: BulkResult; index: number;
  onSelectTitle: (t: string) => void; onRegenTitles: () => void; onKeywordsChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(row.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/20 transition-colors" onClick={() => setOpen(!open)}>
        <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{row.topic}</p>
          {row.selectedTitle && <p className="text-[10px] text-slate-500 truncate">{row.selectedTitle}</p>}
        </div>
        {row.status === "genTitles" && <><span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /><Badge text="Gen judul..." v="loading" /></>}
        {row.status === "idle" && row.titles.length > 0 && <Badge text="Siap" v="success" />}
        {row.status === "loading" && <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /><Badge text="Menulis" v="loading" /></>}
        {row.status === "selesai" && <Badge text="Selesai" v="success" />}
        {row.status === "error" && <Badge text="Gagal" v="error" />}
        <span className="text-slate-700 text-xs">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="border-t border-slate-800 px-4 py-3 flex flex-col gap-2.5 bg-slate-950/30">
          {row.titles.length > 0 && row.status !== "selesai" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pilih Judul</p>
                <button onClick={onRegenTitles} disabled={row.status === "genTitles"}
                  className="text-[10px] text-amber-400 hover:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded transition-colors disabled:opacity-40">
                  🔄 Generate Lagi
                </button>
              </div>
              {row.titles.map((t, ti) => (
                <button key={ti} onClick={() => onSelectTitle(t)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${row.selectedTitle === t ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {row.status !== "selesai" && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Keywords Tambahan</label>
              <input value={row.keywords} onChange={e => onKeywordsChange(e.target.value)} placeholder="keyword1, keyword2..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700" />
            </div>
          )}
          {row.status === "selesai" && row.content && (
            <>
              <div className="flex gap-2"><button onClick={copy} className="text-[11px] px-2.5 py-1 rounded border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all">{copied ? "✓ Disalin" : "Salin"}</button></div>
              <div className="max-h-56 overflow-y-auto bg-slate-900 rounded-lg p-3"><pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{row.content}</pre></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BULK TAB ─────────────────────────────────────────────────────────────────
function BulkTab({ wpSites, addWp, removeWp, user, refreshUser }: {
  wpSites: WPSite[]; addWp: (s: WPSite) => void; removeWp: (id: number) => void;
  user: UserData | null; refreshUser: () => void;
}) {
  const isPro = (user?.plan ?? "free") !== "free";
  const credits = user?.credits ?? 0;
  const [cfg, setCfg] = useState<Config>(defaultCfg());
  const [model, setModel] = useState<ModelInfo>(MODELS[0]);
  const [topicInput, setTopicInput] = useState("");
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [rows, setRows] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const router = useRouter();

  const cost = CREDIT_COST[model.id] ?? 1;
  const validRows = rows.filter(r => r.status === "idle" && r.selectedTitle);

  const generateTitlesForAll = async () => {
    const topics = topicInput.split("\n").map(t => t.trim()).filter(Boolean);
    if (!topics.length) return;
    setGenLoading(true);
    setRows(topics.map(t => ({ topic: t, titles: [], selectedTitle: "", keywords: "", status: "genTitles", content: "" })));
    for (let i = 0; i < topics.length; i++) {
      const titles = await generateTitles(topics[i], 5);
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, titles, selectedTitle: titles[0] || "", status: "idle" } : r));
    }
    setGenLoading(false);
  };

  const regenTitles = async (i: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "genTitles" } : r));
    const titles = await generateTitles(rows[i].topic, 5);
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, titles, selectedTitle: titles[0] || "", status: "idle" } : r));
  };

  const runAll = async () => {
    if (!validRows.length || credits < cost) { setShowUpgrade(true); return; }
    setRunning(true);
    setRows(prev => prev.map(r => r.selectedTitle && r.status === "idle" ? { ...r, status: "loading" } : r));
    let remainingCredits = credits;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "idle" || !rows[i].selectedTitle) continue;
      if (remainingCredits < cost) { setShowUpgrade(true); break; }
      try {
        const text = await generateArticle({
          ...cfg, keyword: rows[i].topic, title: rows[i].selectedTitle,
          extraKeywords: rows[i].keywords,
          modelId: !isPro ? FREE_MODEL_ID : model.id,
          userId: user?.id,
        } as any);
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "selesai", content: text } : r));
        remainingCredits -= cost;
        if (!isPro) break; // gratis hanya 1x
      } catch {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error" } : r));
      }
    }
    refreshUser();
    setRunning(false);
  };

  return (
    <div className="flex gap-5 h-full overflow-hidden">
      {showUpgrade && <UpgradePopup onClose={() => setShowUpgrade(false)} reason="Kredit tidak cukup untuk melanjutkan" />}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-6 pr-1">
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-900/80 px-4 py-3"><span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Bulk Article Generation</span></div>
          <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Topik / Keyword (1 per baris)</label>
              <textarea value={topicInput} onChange={e => setTopicInput(e.target.value)} rows={5}
                placeholder={"panel maker listrik\ncara diet sehat\nbisnis online 2026"}
                className="bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/60 placeholder-slate-700 resize-none" />
            </div>
            <button onClick={generateTitlesForAll} disabled={!topicInput.trim() || genLoading}
              className="w-full py-2.5 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/40 text-amber-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {genLoading ? <><span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />Generate Judul...</> : <>✨ Generate 5 Judul per Topik</>}
            </button>
          </div>
        </div>
        <SettingsForm cfg={cfg} set={setCfg} model={!isPro ? MODELS[0] : model} setModel={setModel}
          wpSites={wpSites} addWp={addWp} removeWp={removeWp}
          wpSel={wpSel} setWpSel={setWpSel} mode="bulk"
          credits={credits} isPro={isPro} />
        <RunBtn onClick={runAll} loading={running}
          disabled={!validRows.length || credits < cost}
          label={`Generate (${validRows.length} artikel · ${validRows.length * cost} 💎)`}
          sublabel={`${rows.filter(r => r.status === "selesai").length}/${rows.length}`} />
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {rows.length === 0
          ? <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl">⊞</div>
              <p className="text-slate-500 text-sm">Masukkan topik lalu klik <span className="text-amber-400 font-semibold">Generate Judul</span></p>
            </div>
          : <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2">
              {rows.map((row, i) => (
                <BulkRowCard key={i} row={row} index={i}
                  onSelectTitle={t => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, selectedTitle: t } : r))}
                  onRegenTitles={() => regenTitles(i)}
                  onKeywordsChange={v => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, keywords: v } : r))} />
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState<"single"|"bulk">("single");
  const [wpSites, setWpSites] = useState<WPSite[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const router = useRouter();

  const addWp = useCallback((s: WPSite) => setWpSites(p => [...p, s]), []);
  const removeWp = useCallback((id: number) => setWpSites(p => p.filter(x => x.id !== id)), []);

  const fetchUser = useCallback(async (uid: string) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setUser(await res.json());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setAuthUser(user); fetchUser(user.id); }
      else router.push("/login");
    });
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isPro = (user?.plan ?? "free") !== "free";
  const credits = user?.credits ?? 0;

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-[#0c0e14]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
              <span className="font-black tracking-tight"><span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span></span>
            </a>
            {wpSites.length > 0 && <span className="text-[10px] text-blue-400 border border-blue-800/50 bg-blue-950/30 px-2.5 py-0.5 rounded-full">🌐 {wpSites.length} situs</span>}
            {user && (
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${credits > 0 ? "text-amber-400 border-amber-800/50 bg-amber-950/30" : "text-red-400 border-red-800/50 bg-red-950/30"}`}>
                💎 {credits} kredit
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPro
              ? <span className="text-[10px] text-emerald-400 border border-emerald-800/50 bg-emerald-950/30 px-2.5 py-0.5 rounded-full font-bold">✓ {user?.plan?.toUpperCase()}</span>
              : <a href="/pricing" className="text-[11px] bg-amber-500 hover:bg-amber-400 text-[#0c0e14] font-black px-3.5 py-1.5 rounded-lg transition-colors">Upgrade Pro</a>
            }
            <button onClick={logout} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 transition-colors">Keluar</button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-800/60 bg-[#0c0e14]">
        <div className="max-w-screen-2xl mx-auto px-5 flex gap-0 pt-1">
          {([{id:"single",label:"1-Click Blog Post",icon:"⚡"},{id:"bulk",label:"Bulk Article Generation",icon:"⊞"}] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all ${tab===t.id?"text-amber-400 border-amber-500 bg-amber-500/5":"text-slate-600 border-transparent hover:text-slate-400"}`}>
              <span className="text-base">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-5 py-5 overflow-hidden" style={{ height: "calc(100vh - 100px)" }}>
        {tab === "single"
          ? <SingleTab wpSites={wpSites} addWp={addWp} removeWp={removeWp} user={user} refreshUser={() => authUser && fetchUser(authUser.id)} />
          : <BulkTab wpSites={wpSites} addWp={addWp} removeWp={removeWp} user={user} refreshUser={() => authUser && fetchUser(authUser.id)} />}
      </main>
    </div>
  );
}
