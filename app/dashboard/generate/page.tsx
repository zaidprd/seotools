"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODELS, ModelInfo, WPSite, Config, UserData, defaultCfg, FREE_MODEL_ID, FREE_MAX_WORDS, FREE_ARTICLE_COST, CREDIT_COST, SVG_CREDIT_COST, AIO_MODEL_ID, AIO_CREDIT_COST } from "@/lib/constants";
import { generateArticle, generateAioArticle } from "@/lib/api";
import { Sec, Inp, RunBtn } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";
import OutlineEditor from "@/components/OutlineEditor";
import ResultPanel from "@/components/ResultPanel";
import WritingLoader from "@/components/WritingLoader";
import UpgradePopup from "@/components/UpgradePopup";
import { createClient } from "@/lib/supabase/client";
import { getWPSites, saveWPSites } from "@/lib/wp-sites";

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

/** Map articleSize string (misal "Sedang (1.000-1.500 kata)") ke wordTarget number. */
function parseWordTargetFromSize(size: string | undefined): number {
  if (!size) return 1600;
  const m = size.match(/\((\d+)\D+(\d+)/);
  if (!m) return 1600;
  const lo = parseInt(m[1], 10);
  const hi = parseInt(m[2], 10);
  return Math.round((lo + hi) / 2);
}

export default function GeneratePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [wpSites, setWpSites] = useState<WPSite[]>([]);

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
  const [showModelTip, setShowModelTip] = useState(false);
  const [mobileTab, setMobileTab] = useState<"form" | "result">("form");
  const [mode, setMode] = useState<"standard" | "aio">("standard");
  const resultRef = useRef<HTMLDivElement>(null);

  const fetchUser = useCallback(async (uid: string) => {
    const res = await fetch(`/api/user?userId=${uid}`);
    if (res.ok) setUser(await res.json());
  }, []);

  useEffect(() => {
    setWpSites(getWPSites());
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setAuthUser(user);
      fetchUser(user.id);
    });
  }, []);

  const addWp = useCallback((s: WPSite) => {
    setWpSites(prev => { const next = [...prev, s]; saveWPSites(next); return next; });
  }, []);
  const removeWp = useCallback((id: number) => {
    setWpSites(prev => { const next = prev.filter(x => x.id !== id); saveWPSites(next); return next; });
  }, []);

  const articleCost = mode === "aio"
    ? (isPro ? AIO_CREDIT_COST : FREE_ARTICLE_COST)
    : (isPro ? (CREDIT_COST[model.id] ?? 1) : FREE_ARTICLE_COST);
  const imgCostExtra = mode === "aio" ? 0 : (isPro ? parseInt(cfg.imgCount || "0") * SVG_CREDIT_COST : 0);
  const cost = articleCost + imgCostExtra;

  const handleGenerateTitle = async () => {
    if (!keyword.trim()) return;
    setGenTitleLoading(true);
    const titles = await generateTitles(keyword);
    setTitleSuggestions(titles);
    setGenTitleLoading(false);
  };

  const generate = async () => {
    if (!keyword.trim()) return;
    // AIO: hanya untuk pengguna berbayar
    if (mode === "aio" && !isPro) {
      setUpgradeReason("Fitur AI Overview hanya untuk pengguna berbayar. Upgrade untuk akses pipeline 7-step dengan Claude Sonnet 4.6.");
      setShowUpgrade(true);
      return;
    }
    if (credits < cost) { setUpgradeReason(`Butuh ${cost} 💎 untuk ${mode === "aio" ? "AI Overview" : "model ini"}, kamu punya ${credits} 💎`); setShowUpgrade(true); return; }
    setLoading(true); setResult(null); setError(null);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    try {
      // Branching: mode AIO (7-step pipeline) vs standard (1-step)
      if (mode === "aio") {
        // Bangun AioGenerateRequest dari state form yang ada
        // modelId selalu Sonnet — dikunci di server maupun client
        const aioReq = {
          keyword: keyword.trim(),
          primaryKeyword: keyword.trim(),
          modelId: AIO_MODEL_ID,
          language: cfg.language || "Indonesia",
          tone: cfg.tone,
          pov: cfg.pov,
          readability: cfg.readability,
          articleType: cfg.articleType,
          wordTarget: parseWordTargetFromSize(cfg.articleSize) || 1600,
          brandName: cfg.brandVoice || "Artikel SEO",
          targetAudience: cfg.details || "Pembaca umum",
          geo: cfg.country || "Indonesia",
          publishDate: new Date().toISOString().slice(0, 10),
          secondaryKeywords: cfg.seoKeywords ? cfg.seoKeywords.split(",").map(s => s.trim()).filter(Boolean) : undefined,
          brandVoice: cfg.brandVoice,
          mustMention: cfg.details,
          recencyMarker: String(new Date().getFullYear()),
          userTitle: title.trim() || undefined,
          userOutlineOverride: outlineRows.length > 0 ? outlineRows.map(r => `${r.type}: ${r.text}`).join("\n") : undefined,
          internalLinkBaseUrl: cfg.internalLinkBaseUrl || undefined,
          skipCritique: false,
          skipRefinement: false,
        };
        const aioRes = await generateAioArticle(aioReq as any);
        setResult(aioRes.fullHtml || aioRes.fullMarkdown);
        setMobileTab("result");
        if (authUser) fetchUser(authUser.id);
        return;
      }

      // Standard mode: 1-step pipeline lama
      const outline = outlineRows.map(r => `${r.type}: ${r.text}`).join("\n");
      const effectiveCfg = !isPro ? { ...cfg, articleSize: FREE_MAX_WORDS } : cfg;
      const text = await generateArticle({
        ...effectiveCfg, keyword, title, outline,
        modelId: !isPro ? FREE_MODEL_ID : model.id,
        userId: user?.id,
      } as any);
      setResult(text);
      setMobileTab("result");
      if (authUser) fetchUser(authUser.id);
    } catch (e: any) {
      if (e.message?.includes("Kredit")) { setUpgradeReason(e.message); setShowUpgrade(true); }
      else {
        setError(e.message);
        setMobileTab("result");
        if (isPro) setShowModelTip(true);
      }
    }
    setLoading(false);
  };

  const currentModel = !isPro ? (MODELS.find(m => m.id === FREE_MODEL_ID) || defaultModel) : model;

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Page header */}
      <div className="border-b border-slate-800/60 pl-14 pr-6 lg:px-6 py-3 flex items-center gap-3 bg-[#0c0e14] flex-shrink-0">
        <span className="text-xl">⚡</span>
        <div>
          <h1 className="font-bold text-white text-sm">1-Click Blog Post</h1>
          <p className="text-[11px] text-slate-500">Dari keyword ke artikel SEO lengkap</p>
        </div>
        {user && (
          <span className={`ml-auto text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${credits > 0 ? "text-amber-400 border-amber-800/50 bg-amber-950/30" : "text-red-400 border-red-800/50 bg-red-950/30"}`}>
            💎 {credits} kredit
          </span>
        )}
      </div>

      {/* Mode switcher: Standard vs AI Overview */}
      <div className="px-4 lg:px-6 pt-3 pb-1 bg-[#0c0e14] flex-shrink-0">
        <div className="inline-flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setMode("standard")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${mode === "standard" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
            title="Generator 1-step klasik">
            <span className="mr-1">🔧</span>Standard
          </button>
          <button
            onClick={() => setMode("aio")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-1.5 ${mode === "aio" ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
            title="Pipeline 7-step untuk Google AI Overviews">
            <span>✨</span>AI Overview
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${mode === "aio" ? "bg-white/20 text-white" : "bg-violet-500/20 text-violet-300"}`}>NEW</span>
          </button>
        </div>
        {mode === "aio" && (
          <p className="text-[11px] text-violet-300/80 mt-2">
            Pipeline 7-step: riset → outline → 10 blok → quality gate → refinement → JSON-LD → meta.{" "}
            <span className="text-amber-400 font-bold">Model: Claude Sonnet 4.6 • {AIO_CREDIT_COST} 💎 per artikel</span>
            {!isPro && <span className="ml-1.5 text-red-400 font-bold">· Pro only</span>}
          </p>
        )}
      </div>

      {/* Mobile tab bar — fixed bottom, only on small screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14] border-t border-slate-800 flex">
        <button
          onClick={() => setMobileTab("form")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[11px] font-bold transition-colors ${mobileTab === "form" ? "text-amber-400" : "text-slate-600"}`}>
          <span className="text-base">⚙️</span>Pengaturan
        </button>
        <button
          onClick={() => setMobileTab("result")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-[11px] font-bold transition-colors relative ${mobileTab === "result" ? "text-amber-400" : "text-slate-600"}`}>
          <span className="text-base">📄</span>Hasil Artikel
          {(loading || result) && (
            <span className={`absolute top-2 right-[30%] w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          )}
        </button>
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden px-3 md:px-5 py-5 pb-20 md:pb-5 min-h-0">
        {showUpgrade && <UpgradePopup onClose={() => setShowUpgrade(false)} reason={upgradeReason} />}

        {/* Left panel */}
        <div className={`${mobileTab === "form" ? "flex" : "hidden"} md:flex w-full md:w-80 flex-shrink-0 flex-col gap-2.5 overflow-y-auto pb-8 pr-1.5`}>
          {/* Keyword & Judul card */}
          <div className="border border-slate-800 rounded-xl overflow-hidden flex-shrink-0">
            <div className="bg-slate-900/80 px-4 py-2.5">
              <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Keyword & Judul</span>
            </div>
            <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-3">
              <Inp label="Keyword Utama *" val={keyword} set={setKeyword} placeholder="cth: cara memulai bisnis online" maxLen={500} />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Judul</label>
                <div className="flex gap-1.5">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kosongkan untuk auto-generate..."
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-700" />
                  <button onClick={handleGenerateTitle} disabled={!keyword.trim() || genTitleLoading}
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

          {/* Outline Editor — collapsed by default */}
          <Sec title="Outline Editor" icon="📐" defaultOpen={true}>
            <OutlineEditor rows={outlineRows} setRows={setOutlineRows} />
          </Sec>

          {/* SettingsForm — semua section collapsed kecuali Core Settings */}
          <SettingsForm cfg={cfg} set={setCfg} model={currentModel} setModel={setModel}
            wpSites={wpSites} addWp={addWp} removeWp={removeWp}
            wpSel={wpSel} setWpSel={setWpSel} mode="single"
            credits={credits} isPro={isPro} />

          {/* Run button — sticky di bawah panel kiri */}
          <div className="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14] to-transparent flex-shrink-0">
            <RunBtn onClick={generate} loading={loading}
              disabled={!keyword.trim() || credits < cost}
              label={`Buat Artikel (${cost} 💎)`} sublabel="Membuat..." />
            {credits === 0 && (
              <button onClick={() => setShowUpgrade(true)}
                className="w-full mt-2 py-2 text-[11px] text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/5 transition-colors">
                💎 Kredit habis — Upgrade sekarang
              </button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className={`${mobileTab === "result" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden min-w-0`} ref={resultRef}>
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
          {error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm max-w-md">✗ {error}</div>
              {showModelTip && (() => {
                const fallback = MODELS.find(m => m.id === currentModel.fallbackId);
                return (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-xs max-w-md text-center space-y-2">
                    <p>
                      💡 Model <strong>{currentModel.label}</strong> mungkin sedang tidak stabil atau overloaded.
                      {fallback && <> Coba beralih ke <strong>{fallback.label}</strong> ({fallback.credits} 💎) yang lebih ringan.</>}
                    </p>
                    {fallback && (
                      <button
                        onClick={() => { setModel(fallback); setShowModelTip(false); setError(null); }}
                        className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg font-bold text-amber-200 transition-colors">
                        Ganti ke {fallback.label} &rarr;
                      </button>
                    )}
                    <button onClick={() => setShowModelTip(false)} className="text-amber-600 hover:text-amber-400 underline text-[10px]">Tutup</button>
                  </div>
                );
              })()}
            </div>
          )}
          {result && <ResultPanel content={result} keyword={keyword} model={currentModel} wpSites={wpSel ? [wpSel] : wpSites} synds={cfg.synds} userId={user?.id} />}
        </div>
      </div>
    </div>
  );
}
