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

        }
      })
      .catch((error: Error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [articleId, router]);

  const save = useCallback(async (fields?: DraftFields) => {
    const current = fields || latestDraft.current;
    if (!current) return;

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
          featured_preset: current.featured_preset,
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

  if (loading) return <div className="grid min-h-[50vh] place-items-center p-6 text-sm text-slate-600">Memuat artikel...</div>;
  if (!draft) return <div className="p-6 text-sm text-red-700">{message || "Artikel tidak ditemukan."}</div>;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-12 sm:px-6 lg:px-8" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
        <div>
          <Link href="/documents" className="text-sm font-semibold text-amber-700 hover:text-amber-900">← Kembali ke dokumen</Link>
          <h1 className="mt-2 text-3xl font-black text-slate-900" style={{ fontFamily: "Sora,sans-serif" }}>Editor artikel</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {message && <span className={message === "Tersimpan" ? "text-emerald-700" : "text-red-700"}>{message}</span>}
          <button onClick={() => save()} disabled={saving}
            className="min-h-11 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold px-5 py-2 rounded-xl transition-colors">
            {saving ? "Menyimpan..." : "Simpan draft"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-4">
          <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="Judul artikel"
            className="w-full rounded-xl border border-stone-300 bg-white px-5 py-4 text-xl font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-slate-600">Isi artikel</div>
            <div contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Mulai tulis artikel..." onInput={(event) => update("content_html", event.currentTarget.innerHTML)} className="article-editor min-h-[620px] px-5 py-6 outline-none sm:px-8" dangerouslySetInnerHTML={{ __html: draft.content_html ?? draft.content ?? "" }} />
          </div>
          <p className="text-xs text-slate-500">Perubahan disimpan sebagai draf artikel. Tinjau kembali format sebelum diterbitkan.</p>
        </section>

        <aside className="h-fit space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div>
            <label className="block mb-1.5 text-sm font-bold text-slate-700">Kata kunci</label>
            <p className="text-sm text-slate-600">{draft.keyword || "—"}</p>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-bold text-slate-700">Alamat artikel</label>
            <input value={draft.slug || ""} onChange={(event) => update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="slug-artikel"
              className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-bold text-slate-700">Deskripsi pencarian</label>
            <textarea value={draft.meta_description || ""} onChange={(event) => update("meta_description", event.target.value)} maxLength={500} rows={4}
              className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">Gambar utama</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">Pilihan gambar utama yang dibuat sebelumnya tetap tersimpan bersama draf.</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Terakhir disimpan: {new Date(draft.updated_at || draft.created_at).toLocaleString("id-ID")}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
