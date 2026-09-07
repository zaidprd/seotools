"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";

interface Article {
  id: string; title: string; keyword: string; model_id: string;
  credits_used: number; word_count: number; created_at: string; published_to: string | null;
}

const PAGE_SIZE = 10;

export default function DocumentsPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);


  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    });
  }, []);

  const fetchArticles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const sb = createClient();
    let query = sb
      .from("articles")
      .select("id, title, keyword, model_id, credits_used, word_count, created_at, published_to", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,keyword.ilike.%${search}%`);
    }

    const { data, count } = await query;
    setArticles(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [userId, page, search]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await createClient().from("articles").delete().eq("id", id).eq("user_id", userId);
    setDeleteId(null);
    fetchArticles();
  };

  const handleCopyId = (id: string) => {
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dokumen</h1>
            <p className="text-slate-500 text-sm">{total} artikel tersimpan</p>
          </div>
          <button onClick={() => router.push("/dashboard/generate")}
            className="min-h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-all  flex items-center gap-2">
            ＋ Buat artikel baru
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari berdasarkan judul atau kata kunci..."
            className="h-11 w-full bg-white border border-stone-200 text-slate-800 text-sm rounded-xl pl-9 pr-4 focus:outline-none focus:border-emerald-500/40 placeholder-stone-400" />
        </div>

        {/* Table */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-stone-300 border-t-emerald-500 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-3xl">▤</p>
              <p className="text-slate-500 text-sm">{search ? "Tidak ada hasil ditemukan" : "Belum ada artikel"}</p>
              {!search && <button onClick={() => router.push("/dashboard/generate")} className="text-emerald-700 text-xs hover:text-emerald-800">Buat artikel pertama →</button>}
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {articles.map(a => <article key={a.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-bold text-slate-900">{a.title || "Tanpa judul"}</h2><p className="mt-1 truncate text-sm text-slate-500">{a.keyword || "Tanpa kata kunci"}</p></div>{a.published_to ? <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Terbit</span> : <span className="flex-shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-slate-600">Draf</span>}</div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-stone-100 py-3 text-sm"><div><dt className="text-slate-500">Jumlah kata</dt><dd className="font-semibold text-slate-800">{(a.word_count || 0).toLocaleString("id-ID")}</dd></div><div><dt className="text-slate-500">Dibuat</dt><dd className="font-semibold text-slate-800">{new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</dd></div></dl>
                  <div className="mt-4 grid grid-cols-[1fr_44px_44px] gap-2"><button onClick={() => router.push(`/dashboard/articles/${a.id}`)} className="min-h-11 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-slate-950">Buka editor</button><button onClick={() => handleCopyId(a.id)} aria-label="Salin ID artikel" className="grid h-11 w-11 place-items-center rounded-lg border border-stone-300 text-sm font-semibold text-slate-700">{copied === a.id ? "✓" : "ID"}</button><button onClick={() => deleteId === a.id ? handleDelete(a.id) : setDeleteId(a.id)} aria-label={deleteId === a.id ? "Konfirmasi hapus artikel" : "Hapus artikel"} className={`grid h-11 w-11 place-items-center rounded-lg border text-sm ${deleteId === a.id ? "border-red-300 bg-red-50 text-red-700" : "border-stone-300 text-slate-600"}`}>{deleteId === a.id ? "✓" : "×"}</button></div>
                </article>)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b border-stone-200">
                      <th className="text-left px-4 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Judul / kata kunci</th>

                      <th className="text-right px-4 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Kata</th>
                      <th className="text-left px-4 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Tanggal</th>
                      <th className="text-left px-4 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider">Terbit</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {articles.map(a => (
                      <tr key={a.id} className="hover:bg-white transition-colors group">
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate text-sm">{a.title || "(tanpa judul)"}</p>
                          <p className="text-xs text-slate-500 truncate">{a.keyword}</p>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-400 text-xs">{(a.word_count || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-500 text-xs">{new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </td>
                        <td className="px-4 py-3">
                          {a.published_to
                            ? <span className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{a.published_to}</span>
                            : <span className="text-xs text-slate-500">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => router.push(`/dashboard/articles/${a.id}`)}
                              className="min-h-11 text-sm text-emerald-700 hover:text-emerald-800 border border-emerald-500/20 hover:border-emerald-500/40 px-3 py-2 rounded-lg transition-all">
                              Editor
                            </button>
                            <button onClick={() => handleCopyId(a.id)}
                              className="min-h-11 text-sm text-slate-600 hover:text-slate-900 border border-stone-300 hover:border-slate-600 px-3 py-2 rounded-lg transition-all">
                              {copied === a.id ? "✓" : "ID"}
                            </button>
                            {deleteId === a.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(a.id)}
                                  className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">Hapus</button>
                                <button onClick={() => setDeleteId(null)}
                                  className="text-xs text-slate-500 px-1 py-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteId(a.id)}
                                aria-label="Hapus artikel" className="grid h-11 w-11 place-items-center rounded-lg border border-transparent text-slate-600 hover:border-red-500/20 hover:text-red-700 transition-all">
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
                  <p className="text-xs text-slate-500">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total} artikel
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-stone-300 disabled:opacity-30 transition-all">← Prev</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${p === page ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "border-stone-200 text-slate-500 hover:border-stone-300 hover:text-slate-900"}`}>
                          {p + 1}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-stone-300 disabled:opacity-30 transition-all">Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
