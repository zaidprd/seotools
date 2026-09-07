"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface ArticleDraft {
  id: string;
  title: string;
  keyword: string;
  content: string;
  content_html: string | null;
  slug: string | null;
  meta_description: string | null;
  featured_preset: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

type DraftFields = Pick<ArticleDraft, "title" | "content" | "content_html" | "slug" | "meta_description" | "featured_preset">;

export default function ArticleEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const articleId = params.id;
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [featuredPresetText, setFeaturedPresetText] = useState("");
  const latestDraft = useRef<ArticleDraft | null>(null);

  useEffect(() => { latestDraft.current = draft; }, [draft]);

  useEffect(() => {
    let active = true;
    fetch(`/api/articles/${articleId}`)
      .then(async (response) => {
        if (response.status === 401) { router.replace("/login"); return null; }
        if (!response.ok) throw new Error("Artikel tidak ditemukan atau tidak dapat dibuka.");
        return response.json() as Promise<ArticleDraft>;
      })
      .then((article) => {
        if (active && article) {
          setDraft(article);
          setFeaturedPresetText(article.featured_preset ? JSON.stringify(article.featured_preset, null, 2) : "");
        }
      })
      .catch((error: Error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [articleId, router]);

  const save = useCallback(async (fields?: DraftFields) => {
    const current = fields || latestDraft.current;
    if (!current) return;
    let featuredPreset: Record<string, unknown> | null = null;
    if (featuredPresetText.trim()) {
      try {
        featuredPreset = JSON.parse(featuredPresetText) as Record<string, unknown>;
        if (!featuredPreset || Array.isArray(featuredPreset)) throw new Error();
      } catch {
        setMessage("Preset featured harus berupa JSON object yang valid.");
        return;
      }
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          content: current.content,
          content_html: current.content_html,
          slug: current.slug,
          meta_description: current.meta_description,
          featured_preset: featuredPreset,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Artikel tidak dapat disimpan.");
      setDraft(data);
      setMessage("Tersimpan");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Artikel tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }, [articleId]);

  const update = <K extends keyof DraftFields>(key: K, value: DraftFields[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setMessage(null);
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Memuat artikel...</div>;
  if (!draft) return <div className="p-6 text-sm text-red-400">{message || "Artikel tidak ditemukan."}</div>;

  return (
    <main className="max-w-5xl mx-auto p-6 pb-12" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
        <div>
          <Link href="/documents" className="text-xs text-amber-400 hover:text-amber-300">← Kembali ke dokumen</Link>
          <h1 className="mt-2 text-2xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Editor artikel</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {message && <span className={message === "Tersimpan" ? "text-emerald-400" : "text-red-400"}>{message}</span>}
          <button onClick={() => save()} disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold px-4 py-2 rounded-xl transition-colors">
            {saving ? "Menyimpan..." : "Simpan draft"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-4">
          <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="Judul artikel"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-white outline-none focus:border-amber-500/60" />
          <textarea value={draft.content_html ?? draft.content ?? ""} onChange={(event) => update("content_html", event.target.value)}
            placeholder="Tulis HTML artikel di sini..." rows={24}
            className="w-full resize-y bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm leading-relaxed text-slate-200 outline-none focus:border-amber-500/60" />
          <p className="text-[11px] text-slate-500">Konten editor disimpan sebagai HTML final. Konten hasil generasi asli tetap dipertahankan.</p>
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-400">Keyword</label>
            <p className="text-sm text-slate-300">{draft.keyword || "—"}</p>
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-400">Slug</label>
            <input value={draft.slug || ""} onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug-artikel"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/60" />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-400">Meta description</label>
            <textarea value={draft.meta_description || ""} onChange={(event) => update("meta_description", event.target.value)} maxLength={500} rows={4}
              className="w-full resize-y bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/60" />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-400">Preset featured (JSON)</label>
            <textarea value={featuredPresetText} onChange={(event) => { setFeaturedPresetText(event.target.value); setMessage(null); }} rows={5}
              placeholder='{ "template": "..." }'
              className="w-full resize-y bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-amber-500/60" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Terakhir disimpan: {new Date(draft.updated_at || draft.created_at).toLocaleString("id-ID")}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
