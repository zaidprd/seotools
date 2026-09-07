"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODELS, ModelInfo, WPSite, Config, UserData, defaultCfg, ARTICLE_SIZES, FREE_MAX_WORDS } from "@/lib/constants";
import { generateArticle, generateTitlesAPI, type ArticleResult } from "@/lib/api";
import { Sec, Inp, RunBtn } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";
import OutlineEditor from "@/components/OutlineEditor";
import ResultPanel from "@/components/ResultPanel";
import WritingLoader from "@/components/WritingLoader";
import UpgradePopup from "@/components/UpgradePopup";
import ImageTemplateGallery from "@/components/images/ImageTemplateGallery";
import { createClient } from "@/lib/supabase/client";
import { getWPSites, saveWPSites } from "@/lib/wp-sites";



export default function GeneratePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [wpSites, setWpSites] = useState<WPSite[]>([]);

  const isAdmin = user?.role === "admin";
  const hasTrialArticle = (user?.trial_articles_remaining ?? 0) > 0;
  const isPro = isAdmin || hasTrialArticle || (user?.plan ?? "free") !== "free";
  const credits = user?.credits ?? 0;
  const wordQuota = user?.monthly_word_quota ?? null;
  const wordsUsed = user?.monthly_words_used ?? 0;
  const wordsRemaining = wordQuota === null ? null : Math.max(0, wordQuota - wordsUsed);
  const maxWordsPerArticle = user?.max_words_per_article ?? 0;
  const maxWordsInSize = (size: string) => Math.max(...[...size.matchAll(/\d[\d.]*/g)].map(match => Number(match[0].replace(/\./g, ""))), 0);
  const availableSizes = wordQuota !== null
    ? ARTICLE_SIZES.filter(size => maxWordsInSize(size) <= maxWordsPerArticle)
    : isPro ? ARTICLE_SIZES : ARTICLE_SIZES.slice(0, 3);
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
  const [result, setResult] = useState<ArticleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const [mobileTab, setMobileTab] = useState<"form" | "result">("form");
  const resultRef = useRef<HTMLDivElement>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cost = 7;
  const selectedWords = maxWordsInSize(!isPro ? FREE_MAX_WORDS : cfg.articleSize);
  const hasGenerationAccess = isAdmin || hasTrialArticle || (wordsRemaining !== null
    ? selectedWords <= maxWordsPerArticle && wordsRemaining >= selectedWords
    : credits >= cost);

  const handleGenerateTitle = async () => {
    if (!keyword.trim()) return;
    setGenTitleLoading(true);
    const titles = await generateTitlesAPI(keyword);
    setTitleSuggestions(titles);
    setGenTitleLoading(false);
  };

  const generate = async () => {
    if (!keyword.trim()) return;
    if (!hasGenerationAccess) { setUpgradeReason("Anda memerlukan 1 hak artikel atau paket aktif untuk membuat artikel."); setShowUpgrade(true); return; }
    setLoading(true); setResult(null); setError(null);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    try {
      const outline = outlineRows.map(r => `${r.type}: ${r.text}`).join("\n");
      const article = await generateArticle({ ...cfg, keyword, title, outline });
      setResult(article);
      setMobileTab("result");
      if (authUser) fetchUser(authUser.id);
    } catch (e: any) {
      if (e.message?.includes("Kredit")) { setUpgradeReason(e.message); setShowUpgrade(true); }
      else {
        setError(e.message);
        setMobileTab("result");

      }
    }
    setLoading(false);
  };

  const saveDraftPatch = useCallback((patch: Record<string, unknown>) => {
    if (!result?.id) return;
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      fetch(`/api/articles/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => undefined);
    }, 800);
  }, [result?.id]);

  useEffect(() => () => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
  }, []);

  const currentModel = model;

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Page header */}
      <div className="border-b border-slate-800/70 bg-[#0c0e14] py-4 pl-16 pr-5 lg:px-7 flex items-center gap-3 flex-shrink-0">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-300">✦</div>
        <div>
          <h1 className="font-bold text-white text-sm">Tulis artikel baru</h1>
          <p className="text-xs text-slate-400">Susun brief, review draft, lalu terbitkan</p>
        </div>
        {user && (
          <span className={`ml-auto text-xs px-2.5 py-1 rounded border font-bold ${hasGenerationAccess ? "text-emerald-400 border-emerald-800/50 bg-emerald-950/30" : "text-amber-300 border-amber-800/50 bg-amber-950/30"}`}>
            {hasGenerationAccess ? "Siap membuat artikel" : wordsRemaining !== null ? "Kuota tidak cukup" : "Paket diperlukan"}
          </span>
        )}
      </div>


      {/* Form/result tabs stay active until the large-screen split layout. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14] border-t border-slate-800 flex">
        <button
          onClick={() => setMobileTab("form")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-bold transition-colors ${mobileTab === "form" ? "text-amber-400" : "text-slate-400"}`}>
          <span className="text-base" aria-hidden="true">☷</span>Pengaturan
        </button>
        <button
          onClick={() => setMobileTab("result")}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-bold transition-colors relative ${mobileTab === "result" ? "text-amber-400" : "text-slate-400"}`}>
          <span className="text-base" aria-hidden="true">▤</span>Hasil Artikel
          {(loading || result) && (
            <span className={`absolute top-2 right-[30%] w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
          )}
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-3 sm:px-5 lg:px-7 py-5 pb-20 lg:pb-6 min-h-0 bg-[#0a101b]">
        {showUpgrade && <UpgradePopup onClose={() => setShowUpgrade(false)} reason={upgradeReason} />}

        {/* Left panel */}
        <div className={`${mobileTab === "form" ? "flex" : "hidden"} lg:flex w-full lg:w-[360px] flex-shrink-0 flex-col gap-3 overflow-y-auto pb-8 pr-1.5`}>
          {/* Keyword & Judul card */}
          <div className="border border-slate-800 rounded-xl overflow-hidden flex-shrink-0">
            <div className="bg-slate-900/80 px-4 py-2.5">
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Brief utama</span>
            </div>
            <div className="px-4 py-3 bg-slate-950/40 flex flex-col gap-3">
              <Inp label="Keyword Utama *" val={keyword} set={setKeyword} placeholder="cth: cara memulai bisnis online" maxLen={500} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">Judul <span className="font-normal text-slate-500">(opsional)</span></label>
                <div className="flex gap-1.5">
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kosongkan untuk auto-generate..."
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700/60 text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500/60 placeholder-slate-500" />
                  <button onClick={handleGenerateTitle} disabled={!keyword.trim() || genTitleLoading}
                    className="flex-shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs px-2.5 rounded-lg transition-colors disabled:opacity-40 flex items-center">
                    {genTitleLoading ? <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> : <span aria-label="Sarankan judul">↗</span>}
                  </button>
                </div>
                {titleSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 bg-slate-900 border border-slate-700 rounded-lg p-2">
                    <p className="text-xs text-slate-400 mb-1">Pilih judul:</p>
                    {titleSuggestions.map((t, i) => (
                      <button key={i} onClick={() => { setTitle(t); setTitleSuggestions([]); }}
                        className="text-left text-xs text-slate-300 hover:text-amber-400 hover:bg-slate-800 px-2 py-1 rounded transition-colors">{t}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400">Panjang artikel</label>
                <select value={!isPro ? FREE_MAX_WORDS : cfg.articleSize} onChange={e => setCfg(prev => ({ ...prev, articleSize: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-700/60 bg-slate-900 px-3 text-xs text-slate-200 outline-none focus:border-amber-500/60">
                  {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <Inp label="Brief artikel" val={cfg.details} set={value => setCfg(prev => ({ ...prev, details: value }))} placeholder="Poin penting, data, sudut bahasan, atau hal yang harus dihindari..." multiline rows={4} maxLen={6000} note="Opsional, tetapi membantu membuat draft lebih sesuai kebutuhan." />
            </div>
          </div>

          {/* Outline Editor — collapsed by default */}
          <Sec title="Struktur artikel" icon="§" defaultOpen={false}>
            <OutlineEditor rows={outlineRows} setRows={setOutlineRows} />
          </Sec>

          {/* SettingsForm — semua section collapsed kecuali Core Settings */}
          <SettingsForm cfg={cfg} set={setCfg} model={currentModel} setModel={setModel}
            wpSites={wpSites} addWp={addWp} removeWp={removeWp}
            wpSel={wpSel} setWpSel={setWpSel} mode="single"
            credits={credits} isPro={isPro} isAio={false} isAdmin={isAdmin} />

          {/* Run button — sticky di bawah panel kiri */}
          <div className="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14] to-transparent flex-shrink-0">
            <RunBtn onClick={generate} loading={loading}
              disabled={!keyword.trim() || !hasGenerationAccess}
              label={hasTrialArticle ? "Gunakan 1 Artikel" : "Buat Artikel"} sublabel="Menyusun draft..." />
            {!isAdmin && !hasGenerationAccess && (
              <button onClick={() => setShowUpgrade(true)}
                className="w-full mt-2 py-2 text-xs text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/5 transition-colors">
                {wordsRemaining !== null ? "Kuota tidak cukup — Lihat pilihan" : "Paket belum aktif — Lihat pilihan"}
              </button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className={`${mobileTab === "result" ? "flex" : "hidden"} lg:flex flex-1 flex-col overflow-hidden min-w-0`} ref={resultRef}>
          {!result && !loading && !error && (
            keyword.trim() ? (
              <div className="flex-1 overflow-y-auto pr-1">
                <ImageTemplateGallery title={title.trim() || keyword.trim()} keyword={keyword.trim()} brand="" />
                <p className="mt-3 text-center text-xs text-slate-400">Pilih ulang dan masukkan desain ke editor setelah artikel selesai dibuat.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-2xl text-amber-300" aria-hidden="true">✦</div>
                <div>
                  <p className="text-slate-300 text-sm font-semibold">Ruang artikel siap digunakan</p>
                  <p className="text-slate-400 text-xs mt-1">Isi keyword dan brief untuk mulai menyusun draft.</p>
                </div>
              </div>
            )
          )}
          {loading && <WritingLoader />}
          {error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm max-w-md">✗ {error}</div>

            </div>
          )}
          {result && <ResultPanel
            content={result.contentMarkdown}
            articleTitle={result.title}
            metaDescription={result.meta.description}
            keyword={keyword}
            slug={result.slug}
            model={currentModel}
            wpSites={wpSel ? [wpSel] : wpSites}
            synds={cfg.synds}
            userId={user?.id}
            onContentChange={html => saveDraftPatch({ content_html: html })}
            onFeaturedImageChange={image => saveDraftPatch({ featured_preset: image })}
          />}
        </div>
      </div>
    </div>
  );
}
