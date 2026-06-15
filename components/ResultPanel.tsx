"use client";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { WPSite, ModelInfo, Synds, PROVIDER_COLORS } from "@/lib/constants";
import { publishToWordPress } from "@/lib/api";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ breaks: true, gfm: true } as any);

function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}

// ─── SEO Analyzer ──────────────────────────────────────────────────────────────
type CheckLevel = "ok" | "warn" | "fail";
interface SEOCheck { label: string; level: CheckLevel; detail?: string; }

function analyzeSEO(content: string, keyword: string) {
  if (!keyword.trim()) return null;
  const kw = keyword.toLowerCase().trim();
  const plain = content.replace(/<[^>]+>/g, " ").toLowerCase();
  const words = plain.split(/\s+/).filter(Boolean);
  const total = words.length;
  const kwCount = plain.split(kw).length - 1;
  const density = total > 0 ? (kwCount / total) * 100 : 0;
  const first100 = words.slice(0, 100).join(" ");
  const h1 = content.match(/^#\s+(.+)/m) || content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h2h3 = [...(content.matchAll(/^#{2,3}\s+.+/gm) || []), ...(content.matchAll(/<h[23][^>]*>[^<]+<\/h[23]>/gi) || [])];
  const metaMatch = content.match(/META:\s*(.+)/i);
  const meta = metaMatch ? metaMatch[1].trim() : "";
  const sentences = plain.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 3);
  const avgSent = sentences.length > 0 ? sentences.reduce((s, x) => s + x.trim().split(/\s+/).length, 0) / sentences.length : 0;

  const checks: SEOCheck[] = [
    { label: "Keyword density 0.5–2.5%", level: density >= 0.8 && density <= 2.0 ? "ok" : density >= 0.5 && density <= 2.5 ? "warn" : "fail", detail: `${density.toFixed(1)}%` },
    { label: "Keyword di 100 kata pertama", level: first100.includes(kw) ? "ok" : "fail" },
    { label: "Keyword di H1", level: (h1 ? h1[1] || h1[0] : "").toLowerCase().includes(kw) ? "ok" : "fail" },
    { label: "Keyword di H2/H3", level: h2h3.some(h => h[0].toLowerCase().includes(kw)) ? "ok" : "warn" },
    { label: "Panjang artikel", level: total >= 600 ? "ok" : total >= 300 ? "warn" : "fail", detail: `${total} kata` },
    { label: "Meta description 120–160 kar", level: meta.length >= 120 && meta.length <= 160 ? "ok" : meta.length > 0 ? "warn" : "fail", detail: meta ? `${meta.length} kar` : "Tidak ada" },
    { label: "Keyword di meta description", level: meta.toLowerCase().includes(kw) ? "ok" : meta ? "warn" : "fail" },
    { label: "Ada seksi FAQ", level: /faq|pertanyaan umum/i.test(content) ? "ok" : "warn" },
    { label: "Ada kesimpulan", level: /kesimpulan|penutup|conclusion/i.test(content) ? "ok" : "warn" },
    { label: "Rata-rata kalimat", level: avgSent <= 18 ? "ok" : avgSent <= 22 ? "warn" : "fail", detail: `${avgSent.toFixed(1)} kata/kalimat` },
  ];
  const score = Math.round(checks.reduce((s, c) => s + (c.level === "ok" ? 10 : c.level === "warn" ? 5 : 0), 0));
  return { checks, score, wordCount: total };
}

function SEOPanel({ content, keyword }: { content: string; keyword: string }) {
  const result = useMemo(() => analyzeSEO(content, keyword), [content, keyword]);
  if (!keyword) return <div className="p-4 text-xs text-slate-500 text-center">Masukkan keyword untuk cek SEO</div>;
  if (!result) return null;
  const { checks, score, wordCount } = result;
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-red-400";
  const scoreBg = score >= 80 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : "bg-red-500";
  const icon = (l: CheckLevel) => l === "ok" ? "✅" : l === "warn" ? "⚠️" : "❌";
  return (
    <div className="flex flex-col gap-2.5 p-3 overflow-y-auto h-full">
      <div className="flex items-center gap-2.5">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="18" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={scoreColor}
              strokeDasharray={`${2 * Math.PI * 18 * score / 100} ${2 * Math.PI * 18}`} />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <p className="font-bold text-white text-xs">{score >= 80 ? "SEO Bagus!" : score >= 55 ? "Perlu Perbaikan" : "Banyak Kurang"}</p>
          <p className="text-[10px] text-slate-500">{wordCount} kata · {checks.filter(c => c.level === "ok").length}/{checks.length} ok</p>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1"><div className={`h-1 rounded-full ${scoreBg}`} style={{ width: `${score}%` }} /></div>
      <div className="flex flex-col gap-1">
        {checks.map((c, i) => (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <span className="text-xs flex-shrink-0 mt-0.5">{icon(c.level)}</span>
            <div className="flex-1 min-w-0">
              <span className={`text-[11px] ${c.level === "ok" ? "text-slate-300" : c.level === "warn" ? "text-amber-400/80" : "text-slate-400"}`}>{c.label}</span>
              {c.detail && <span className="text-[10px] text-slate-600 ml-1">({c.detail})</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TipTap Toolbar ────────────────────────────────────────────────────────────
function TipTapToolbar({ editor, wpSite, onUpload, onAISvg, isUploading, isAIGenerating, uploadError }: {
  editor: ReturnType<typeof useEditor>;
  wpSite: WPSite | null;
  onUpload: (file: File) => void;
  onAISvg: () => void;
  isUploading: boolean;
  isAIGenerating: boolean;
  uploadError: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!editor) return null;

  const btn = (active: boolean, action: () => void, label: string, title: string, extra = "") =>
    <button onClick={action} title={title}
      className={`text-[11px] px-2 py-1.5 rounded-lg border transition-all ${active ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : `border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white ${extra}`}`}>
      {label}
    </button>;

  const insertLink = () => {
    const url = window.prompt("Masukkan URL:");
    if (!url) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-slate-800 bg-slate-900/60">
      {/* Text formatting */}
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold", "font-black")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic", "italic")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", "Heading 3")}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List", "Bullet List")}
      {btn(editor.isActive("link"), insertLink, "🔗", "Insert Link")}

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Image upload */}
      <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} title={wpSite ? `Upload ke ${wpSite.name}` : "Upload gambar (base64)"}
        className={`text-[11px] px-2 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
          wpSite ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/60" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
        } disabled:opacity-50`}>
        {isUploading ? <><span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />Uploading...</> : <>📁 {wpSite ? "Upload ke WP" : "Upload"}</>}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />


      {/* AI SVG */}
      <button onClick={onAISvg} disabled={isAIGenerating} title="Generate ilustrasi SVG dengan AI (gratis)"
        className="text-[11px] px-2 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 hover:bg-violet-500/5 disabled:opacity-50 transition-all flex items-center gap-1">
        {isAIGenerating ? <><span className="w-2.5 h-2.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />Generating...</> : "✨ AI SVG"}
      </button>

      {uploadError && <span className="text-[10px] text-red-400 ml-1">✗ {uploadError}</span>}
    </div>
  );
}

// ─── Main ResultPanel ──────────────────────────────────────────────────────────
export default function ResultPanel({ content: initialContent, keyword = "", model, wpSites, synds, userId }: {
  content: string; keyword?: string; model: ModelInfo; wpSites: WPSite[]; synds: Synds; userId?: string;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [htmlContent, setHtmlContent] = useState(() => {
    try { return sanitizeHtml(marked.parse(initialContent) as string); } catch { return initialContent; }
  });
  // Debounced content for SEO checker — recalculates 1s after user stops typing
  const [seoContent, setSeoContent] = useState(htmlContent);
  useEffect(() => {
    const t = setTimeout(() => setSeoContent(htmlContent), 1000);
    return () => clearTimeout(t);
  }, [htmlContent]);
  const [wpSel, setWpSel] = useState<WPSite | null>(null);
  const [postStatus, setPostStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [pubResult, setPubResult] = useState<{ link: string } | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSvgPreview, setShowSvgPreview] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-amber-400 underline" } }),
    ],
    content: htmlContent,
    onUpdate: ({ editor }) => setHtmlContent(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "outline-none min-h-full p-4 text-slate-200 text-sm leading-relaxed",
      },
    },
  });

  // Ensure editor always starts in correct mode
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(mode === "edit");
    }
  }, [mode, editor]);

  const titleMatch = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i) || initialContent.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : initialContent.slice(0, 60);

  const copy = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "artikel.html"; a.click();
    URL.revokeObjectURL(url);
  };

  // Upload image to WordPress or base64 fallback
  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (!wpSel) {
      // Fallback base64
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target?.result as string;
        editor?.chain().focus().setImage({ src, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch(`${wpSel.url}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${wpSel.user}:${wpSel.pass}`)}`,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        },
        body: formData,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);
      editor?.chain().focus().setImage({ src: data.source_url, alt: data.alt_text || file.name }).run();
    } catch (e: any) {
      setUploadError(e.message);
      // Fallback to base64 on error
      const reader = new FileReader();
      reader.onload = ev => {
        const src = ev.target?.result as string;
        editor?.chain().focus().setImage({ src, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
    }
    setIsUploading(false);
  };

  const handleAISvg = async () => {
    if (!userId) { setAiError("Login diperlukan"); return; }
    const desc = window.prompt("Deskripsi ilustrasi SVG (contoh: diagram alur SEO, infografis langkah-langkah, ilustrasi konsep):");
    if (!desc) return;
    setIsAIGenerating(true); setAiError(null);
    try {
      const res = await fetch("/api/generate-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: desc, keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Tampilkan preview sebelum insert
      setShowSvgPreview(data.svg);
    } catch (e: any) { setAiError(e.message); }
    setIsAIGenerating(false);
  };

  const insertSvg = (svg: string) => {
    // Convert SVG ke data URI lalu insert sebagai image
    const b64 = btoa(unescape(encodeURIComponent(svg)));
    const src = `data:image/svg+xml;base64,${b64}`;
    editor?.chain().focus().setImage({ src, alt: "Ilustrasi AI" }).run();
    setShowSvgPreview(null);
  };


  // Upload semua gambar base64 di konten ke WP Media Library, return konten dengan URL WP
  const uploadBase64ToWP = useCallback(async (html: string, site: WPSite): Promise<string> => {
    const regex = /<img([^>]*?)src="(data:([^;]+);base64,([^"]+))"([^>]*?)>/gi;
    let result = html;
    const matches: Array<{ full: string; pre: string; dataUrl: string; mime: string; b64: string; post: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      matches.push({ full: m[0], pre: m[1], dataUrl: m[2], mime: m[3], b64: m[4], post: m[5] });
    }
    for (const img of matches) {
      try {
        const byteStr = atob(img.b64);
        const bytes = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: img.mime });
        const ext = img.mime.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const file = new File([blob], `artikel-seo-img-${Date.now()}.${ext}`, { type: img.mime });
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`${site.url.replace(/\/+$/, "")}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${site.user}:${site.pass}`)}`,
            "Content-Disposition": `attachment; filename="${file.name}"`,
          },
          body: fd,
        });
        if (r.ok) {
          const data = await r.json();
          const wpUrl: string = data.source_url;
          // Ganti hanya src base64 dengan URL WP, pertahankan atribut lain
          result = result.replace(img.full, `<img${img.pre}src="${wpUrl}"${img.post}>`);
        }
      } catch { /* pertahankan base64 jika upload gagal */ }
    }
    return result;
  }, []);

  const publish = async () => {
    if (!wpSel) return;
    setPublishing(true); setPubResult(null); setPubError(null);
    try {
      // Upload semua gambar base64 ke WP Media Library sebelum publish
      let content = htmlContent;
      if (/data:[^"]+;base64,/.test(content)) {
        content = await uploadBase64ToWP(content, wpSel);
      }
      const r = await publishToWordPress(wpSel, {
        title, content,
        status: scheduledAt ? "future" : postStatus,
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
          {(["preview", "edit"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${mode === m ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-slate-700 hover:border-slate-600 text-slate-400"}`}>
              {m === "preview" ? "👁 Preview" : "✏️ Edit"}
            </button>
          ))}
          <button onClick={copy} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all">
            {copied ? "✓ Salin" : "📋 Salin"}
          </button>
          <button onClick={download} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-all">
            ⬇ HTML
          </button>
        </div>
      </div>

      {/* Syndication */}
      {Object.entries(synds).some(([, v]) => v) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-600">Sindikasi:</span>
          {synds.twitter && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">𝕏 Twitter</span>}
          {synds.linkedin && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">in LinkedIn</span>}
          {synds.wa && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">📱 WhatsApp</span>}
        </div>
      )}

      {/* WordPress publish */}
      {wpSites.length > 0 && (
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 flex flex-col gap-2">
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
            <div className="flex items-center gap-2 flex-wrap">
              <select value={scheduledAt ? "future" : postStatus}
                onChange={e => { if (e.target.value !== "future") { setPostStatus(e.target.value); setScheduledAt(""); } }}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-2 focus:outline-none flex-shrink-0">
                <option value="draft">Draft</option>
                <option value="publish">Langsung Publish</option>
                <option value="future">Jadwalkan</option>
              </select>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500/40" />
              <button onClick={publish} disabled={publishing}
                className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors">
                {publishing ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Mengirim...</> : `⬆ ${scheduledAt ? "Jadwalkan" : `Kirim ke ${wpSel.name}`}`}
              </button>
            </div>
          )}
          {pubResult && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-[11px] text-emerald-300">✓ Berhasil! <a href={pubResult.link} target="_blank" className="underline">{pubResult.link}</a></div>}
          {pubError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300">✗ {pubError}</div>}
        </div>
      )}

      {/* SVG Preview Modal */}
      {showSvgPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl flex flex-col gap-4 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Preview Ilustrasi SVG</p>
              <button onClick={() => setShowSvgPreview(null)} className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="bg-white rounded-xl overflow-hidden"
              dangerouslySetInnerHTML={{ __html: showSvgPreview }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSvgPreview(null)}
                className="text-xs px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors">
                Batal
              </button>
              <button onClick={() => insertSvg(showSvgPreview)}
                className="text-xs px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors">
                ✓ Sisipkan ke Artikel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">

        {/* Preview */}
        {mode === "preview" && (
          <>
            <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 bg-slate-900/80">
              <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
              <span className="text-[11px] text-slate-600 ml-1">Preview</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5
              [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-5 [&_h1]:leading-tight
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_h2]:mt-6
              [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-200 [&_h3]:mb-2 [&_h3]:mt-4
              [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-3
              [&_strong]:text-white [&_strong]:font-bold [&_em]:text-slate-200 [&_em]:italic
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:text-slate-300 [&_li]:mb-1
              [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:mb-3
              [&_a]:text-amber-400 [&_a]:underline [&_a]:underline-offset-2
              [&_code]:text-amber-300 [&_code]:bg-slate-900/80 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm
              [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4 [&_table]:text-sm
              [&_th]:border [&_th]:border-slate-700 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-slate-900/60 [&_th]:text-white [&_th]:text-left
              [&_td]:border [&_td]:border-slate-700/60 [&_td]:px-3 [&_td]:py-2 [&_td]:text-slate-300
              [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:mx-auto [&_img]:block [&_img]:my-4"
              dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </>
        )}

        {/* Edit */}
        {mode === "edit" && (
          <>
            <TipTapToolbar
              editor={editor}
              wpSite={wpSel}
              onUpload={handleUpload}
              onAISvg={handleAISvg}
              isUploading={isUploading}
              isAIGenerating={isAIGenerating}
              uploadError={uploadError}
            />
            {aiError && <div className="px-3 py-1.5 text-[11px] text-red-400 bg-red-500/5 border-b border-red-500/10">✗ AI: {aiError}</div>}
            {/* Split: TipTap + SEO panel */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto
                [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full
                [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-black [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-5
                [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-5
                [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:text-slate-200 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4
                [&_.ProseMirror_p]:text-slate-300 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:mb-2
                [&_.ProseMirror_strong]:text-white [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic
                [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-2
                [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-2
                [&_.ProseMirror_li]:text-slate-300 [&_.ProseMirror_li]:mb-1
                [&_.ProseMirror_a]:text-amber-400 [&_.ProseMirror_a]:underline
                [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-amber-500/40 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-slate-400 [&_.ProseMirror_blockquote]:italic
                [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-xl [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:block [&_.ProseMirror_img]:mx-auto
                [&_.ProseMirror_code]:text-amber-300 [&_.ProseMirror_code]:bg-slate-900/80 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm
                [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:text-sm
                [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-slate-700 [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:text-white [&_.ProseMirror_th]:bg-slate-900/60
                [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-slate-700/60 [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_td]:text-slate-300
                [&_.ProseMirror_hr]:border-slate-700 [&_.ProseMirror_hr]:my-4
                [&_.ProseMirror_.is-editor-empty:first-child::before]:content-['Tulis_artikel_di_sini...'] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-slate-600 [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0">
                <EditorContent editor={editor} className="h-full" />
              </div>
              {/* SEO Panel */}
              <div className="w-52 flex-shrink-0 border-l border-slate-800 bg-slate-950/30 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/40">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">🎯 SEO Checker</p>
                </div>
                <SEOPanel content={seoContent} keyword={keyword} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
