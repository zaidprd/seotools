"use client";
import { useState } from "react";
import { WPSite, ModelInfo, Synds, PROVIDER_COLORS } from "@/lib/constants";
import { publishToWordPress } from "@/lib/api";

export default function ResultPanel({ content, model, wpSites, synds }: { content: string; model: ModelInfo; wpSites: WPSite[]; synds: Synds }) {
  const [copied, setCopied] = useState(false);
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [postStatus, setPostStatus] = useState("draft");
  const [publishing, setPublishing] = useState(false);
  const [pubResult, setPubResult] = useState<{ link: string } | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);

  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : content.slice(0, 60);

  const publish = async () => {
    if (!wpSel) return;
    setPublishing(true); setPubResult(null); setPubError(null);
    try {
      const r = await publishToWordPress(wpSel, { title, content, status: postStatus });
      setPubResult({ link: r.link });
    } catch (e: any) { setPubError(e.message); }
    setPublishing(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Artikel Siap</span>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${PROVIDER_COLORS[model.provider]}`}>{model.label}</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={copy} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all">{copied ? "✓ Disalin" : "📋 Salin"}</button>
        </div>
      </div>

      {Object.entries(synds).some(([, v]) => v) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-600">Sindikasi:</span>
          {synds.twitter && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">𝕏 Twitter</span>}
          {synds.linkedin && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">in LinkedIn</span>}
          {synds.wa && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">📱 WhatsApp</span>}
        </div>
      )}

      {wpSites.length > 0 && (
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-blue-300">🌐 Publish ke WordPress</p>
          <div className="flex flex-wrap gap-1.5">
            {wpSites.map(s => <button key={s.id} onClick={() => setWpSel(wpSel?.id === s.id ? null : s)} className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${wpSel?.id === s.id ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "border-slate-700 text-slate-400 hover:border-blue-500/30"}`}>{s.name}</button>)}
          </div>
          {wpSel && (
            <div className="flex items-center gap-2">
              <select value={postStatus} onChange={e => setPostStatus(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2 focus:outline-none">
                <option value="draft">Draft</option><option value="publish">Langsung Publish</option><option value="pending">Pending Review</option>
              </select>
              <button onClick={publish} disabled={publishing} className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                {publishing ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengirim...</> : <>⬆ Kirim ke {wpSel.name}</>}
              </button>
            </div>
          )}
          {pubResult && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-[11px] text-emerald-300">✓ Berhasil! <a href={pubResult.link} target="_blank" className="underline">{pubResult.link}</a></div>}
          {pubError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300">✗ {pubError}</div>}
        </div>
      )}

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/80">
          <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
          <span className="text-[11px] text-slate-600 ml-1">artikel.md</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5"><pre className="text-sm text-slate-200 whitespace-pre-wrap leading-7 font-sans">{content}</pre></div>
      </div>
    </div>
  );
}
