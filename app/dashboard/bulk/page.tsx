"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODELS, ModelInfo, WPSite, Config, UserData, defaultCfg, FREE_MODEL_ID, CREDIT_COST } from "@/lib/constants";
import { generateArticle } from "@/lib/api";
import { RunBtn, Badge } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";
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

interface BulkResult { topic: string; titles: string[]; selectedTitle: string; keywords: string; status: "idle"|"genTitles"|"loading"|"selesai"|"error"; content: string; }

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
                  🔄 Regen
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
              <button onClick={copy} className="text-[11px] px-2.5 py-1 rounded border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all w-fit">{copied ? "✓ Disalin" : "Salin"}</button>
              <div className="max-h-56 overflow-y-auto bg-slate-900 rounded-lg p-3">
                <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{row.content}</pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BulkPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [wpSites, setWpSites] = useState<WPSite[]>([]);
  const [cfg, setCfg] = useState<Config>(defaultCfg());
  const [model, setModel] = useState<ModelInfo>(MODELS[0]);
  const [topicInput, setTopicInput] = useState("");
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [rows, setRows] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPro = (user?.plan ?? "free") !== "free";
  const credits = user?.credits ?? 0;
  const cost = CREDIT_COST[model.id] ?? 1;
  const validRows = rows.filter(r => r.status === "idle" && r.selectedTitle);

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

  const addWp = useCallback((s: WPSite) => { setWpSites(prev => { const n = [...prev, s]; saveWPSites(n); return n; }); }, []);
  const removeWp = useCallback((id: number) => { setWpSites(prev => { const n = prev.filter(x => x.id !== id); saveWPSites(n); return n; }); }, []);

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
        if (!isPro) break;
      } catch {
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error" } : r));
      }
    }
    if (authUser) fetchUser(authUser.id);
    setRunning(false);
  };

  return (
    <div className="h-screen flex flex-col" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div className="border-b border-slate-800/60 px-6 py-3 flex items-center gap-3 bg-[#0c0e14]">
        <span className="text-xl">⊞</span>
        <div>
          <h1 className="font-bold text-white text-sm">Bulk Article Generation</h1>
          <p className="text-[11px] text-slate-500">Generate banyak artikel sekaligus</p>
        </div>
        {!isPro && <span className="ml-auto text-[10px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-full">Hanya 1 artikel gratis</span>}
      </div>

      <div className="flex flex-1 gap-5 overflow-hidden px-5 py-5">
        {showUpgrade && <UpgradePopup onClose={() => setShowUpgrade(false)} reason="Kredit tidak cukup untuk melanjutkan" />}

        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-6 pr-1">
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="bg-slate-900/80 px-4 py-3"><span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Topik Artikel</span></div>
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
    </div>
  );
}
