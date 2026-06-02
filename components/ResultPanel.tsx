"use client";
import { useState, useMemo } from "react";
import { WPSite, ModelInfo, Synds, PROVIDER_COLORS } from "@/lib/constants";
import { publishToWordPress } from "@/lib/api";

// ─── SEO Checker ──────────────────────────────────────────────────────────────
function analyzeSEO(content: string, keyword: string) {
  if (!keyword.trim()) return null;
  const kw = keyword.toLowerCase().trim();
  const text = content.toLowerCase();
  const words = content.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const kwCount = text.split(kw).length - 1;
  const density = totalWords > 0 ? (kwCount / totalWords) * 100 : 0;

  const first100 = words.slice(0, 100).join(" ").toLowerCase();
  const h1 = content.match(/^#\s+(.+)/m);
  const h2h3 = content.match(/^#{2,3}\s+.+/gm) || [];
  const metaMatch = content.match(/META:\s*(.+)/i);
  const meta = metaMatch ? metaMatch[1].trim() : "";
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 3);
  const avgSent = sentences.length > 0
    ? sentences.reduce((s, x) => s + x.trim().split(/\s+/).length, 0) / sentences.length : 0;

  const checks = [
    { label: "Keyword density 0.5–2.5%", ok: density >= 0.5 && density <= 2.5, detail: `${density.toFixed(1)}%` },
    { label: "Keyword di 100 kata pertama", ok: first100.includes(kw) },
    { label: "Keyword di H1", ok: h1 ? h1[1].toLowerCase().includes(kw) : false },
    { label: "Keyword di minimal 1 H2/H3", ok: h2h3.some(h => h.toLowerCase().includes(kw)) },
    { label: `Panjang > 300 kata`, ok: totalWords > 300, detail: `${totalWords} kata` },
    { label: "Meta description 120–160 karakter", ok: meta.length >= 120 && meta.length <= 160, detail: meta ? `${meta.length} kar` : "Tidak ada" },
    { label: "Keyword di meta description", ok: meta.toLowerCase().includes(kw) },
    { label: "Ada seksi FAQ", ok: /faq|pertanyaan umum/i.test(content) },
    { label: "Ada kesimpulan", ok: /kesimpulan|penutup|conclusion/i.test(content) },
    { label: "Rata-rata kalimat < 20 kata", ok: avgSent < 20, detail: `${avgSent.toFixed(1)} kata/kalimat` },
  ];

  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { checks, score, wordCount: totalWords };
}

function SEOChecker({ content, keyword }: { content: string; keyword: string }) {
  const result = useMemo(() => analyzeSEO(content, keyword), [content, keyword]);
  if (!result) return <p className="text-xs text-slate-500 p-4">Masukkan keyword untuk cek SEO</p>;

  const { checks, score, wordCount } = result;
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const scoreBg = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor"
              strokeWidth="5" strokeLinecap="round"
              className={scoreColor}
              strokeDasharray={`${2 * Math.PI * 22 * score / 100} ${2 * Math.PI * 22}`} />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm">{score >= 80 ? "SEO Bagus!" : score >= 60 ? "Perlu Perbaikan" : "Perlu Banyak Perbaikan"}</p>
          <p className="text-xs text-slate-500">{wordCount} kata · {checks.filter(c => c.ok).length}/{checks.length} lulus</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${scoreBg}`} style={{ width: `${score}%` }} />
      </div>

      {/* Checks */}
      <div className="flex flex-col gap-1.5">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-sm flex-shrink-0 ${c.ok ? "text-emerald-400" : "text-red-400"}`}>{c.ok ? "✅" : "❌"}</span>
            <span className={`text-xs flex-1 ${c.ok ? "text-slate-300" : "text-slate-400"}`}>{c.label}</span>
            {c.detail && <span className="text-[10px] text-slate-600 flex-shrink-0">{c.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultPanel({ content: initialContent, keyword = "", model, wpSites, synds }: {
  content: string; keyword?: string; model: ModelInfo; wpSites: WPSite[]; synds: Synds;
}) {
  const [mode, setMode] = useState<"preview" | "edit" | "seo">("preview");
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [postStatus, setPostStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
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
      const effectiveStatus = scheduledAt ? "future" : postStatus;
      const r = await publishToWordPress(wpSel, {
        title, content,
        status: effectiveStatus,
        scheduledAt: scheduledAt || undefined,
        focusKeyword: keyword || undefined,
      });
      setPubResult({ link: r.link });
    } catch (e: any) { setPubError(e.message); }
    setPublishing(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Artikel Siap
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${PROVIDER_COLORS[model.provider] || "text-slate-400 border-slate-700"}`}>{model.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode tabs */}
          {(["preview", "edit", "seo"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${mode === m ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-slate-700 hover:border-slate-600 text-slate-400"}`}>
              {m === "preview" ? "👁 Preview" : m === "edit" ? "✏️ Edit" : "🎯 SEO"}
            </button>
          ))}
          <button onClick={copy}
            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all">
            {copied ? "✓ Disalin" : "📋 Salin"}
          </button>
        </div>
      </div>

      {/* Syndication badges */}
      {Object.entries(synds).some(([, v]) => v) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-600">Sindikasi:</span>
          {synds.twitter && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">𝕏 Twitter</span>}
          {synds.linkedin && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">in LinkedIn</span>}
          {synds.wa && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">📱 WhatsApp</span>}
        </div>
      )}

      {/* WordPress publish panel */}
      {wpSites.length > 0 && (
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-blue-300">🌐 Publish ke WordPress</p>
          <div className="flex flex-wrap gap-1.5">
            {wpSites.map(s => (
              <button key={s.id} onClick={() => setWpSel(wpSel?.id === s.id ? null : s)}
                className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all ${wpSel?.id === s.id ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "border-slate-700 text-slate-400 hover:border-blue-500/30"}`}>
                {s.name}
              </button>
            ))}
          </div>
          {wpSel && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <select value={scheduledAt ? "future" : postStatus}
                  onChange={e => { if (e.target.value !== "future") { setPostStatus(e.target.value); setScheduledAt(""); } }}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2 focus:outline-none flex-shrink-0">
                  <option value="draft">Draft</option>
                  <option value="publish">Langsung Publish</option>
                  <option value="pending">Pending Review</option>
                  <option value="future">Jadwalkan</option>
                </select>
                {/* Schedule datetime picker */}
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[11px] text-slate-500">📅</span>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500/40" />
                </div>
                <button onClick={publish} disabled={publishing}
                  className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors">
                  {publishing ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengirim...</> : <>⬆ {scheduledAt ? "Jadwalkan" : `Kirim ke ${wpSel.name}`}</>}
                </button>
              </div>
              {scheduledAt && <p className="text-[10px] text-blue-400">Akan dipublish: {new Date(scheduledAt).toLocaleString("id-ID")}</p>}
            </div>
          )}
          {pubResult && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-[11px] text-emerald-300">✓ Berhasil! <a href={pubResult.link} target="_blank" className="underline">{pubResult.link}</a></div>}
          {pubError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300">✗ {pubError}</div>}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        {mode !== "seo" && (
          <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/80">
            <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
            <span className="text-[11px] text-slate-600 ml-1">{mode === "edit" ? "artikel.md — Mode Edit" : "artikel.md"}</span>
            {mode === "edit" && <span className="ml-auto text-[10px] text-amber-400/70">● Sedang diedit</span>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {mode === "preview" && (
            <pre className="p-5 text-sm text-slate-200 whitespace-pre-wrap leading-7 font-sans">{content}</pre>
          )}
          {mode === "edit" && (
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="w-full h-full p-5 bg-transparent text-sm text-slate-200 font-sans leading-7 focus:outline-none resize-none"
              spellCheck={false} />
          )}
          {mode === "seo" && (
            <SEOChecker content={content} keyword={keyword} />
          )}
        </div>
      </div>
    </div>
  );
}
