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
      <div className="p-6" style={{ fontFamily: "'DM Sans',sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Sora,sans-serif" }}>Dokumen</h1>
            <p className="text-slate-500 text-sm">{total} artikel tersimpan</p>
          </div>
          <button onClick={() => router.push("/dashboard/generate")}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25 flex items-center gap-2">
            ⚡ Buat Artikel Baru
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari berdasarkan judul atau keyword..."
            className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500/40 placeholder-slate-600" />
        </div>

        {/* Table */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-3xl">📝</p>
              <p className="text-slate-500 text-sm">{search ? "Tidak ada hasil ditemukan" : "Belum ada artikel"}</p>
              {!search && <button onClick={() => router.push("/dashboard/generate")} className="text-amber-400 text-xs hover:text-amber-300">Buat artikel pertama →</button>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800">
                      <th className="text-left px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Judul / Keyword</th>
                      <th className="text-left px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Model</th>
                      <th className="text-right px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Kredit</th>
                      <th className="text-right px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Kata</th>
                      <th className="text-left px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Tanggal</th>
                      <th className="text-left px-4 py-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">Published</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {articles.map(a => (
                      <tr key={a.id} className="hover:bg-slate-900/40 transition-colors group">
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-white truncate text-sm">{a.title || "(tanpa judul)"}</p>
                          <p className="text-[11px] text-slate-500 truncate">{a.keyword}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-full">
                            {a.model_id?.split("/").pop()?.split("-").slice(0, 2).join("-") || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-amber-400 text-xs font-bold">{a.credits_used ?? 1} 💎</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-300 text-xs">{(a.word_count || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-400 text-xs">{new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </td>
                        <td className="px-4 py-3">
                          {a.published_to
                            ? <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{a.published_to}</span>
                            : <span className="text-[11px] text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopyId(a.id)}
                              className="text-[11px] text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-2 py-1 rounded-lg transition-all">
                              {copied === a.id ? "✓" : "ID"}
                            </button>
                            {deleteId === a.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(a.id)}
                                  className="text-[11px] text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">Hapus</button>
                                <button onClick={() => setDeleteId(null)}
                                  className="text-[11px] text-slate-500 px-1 py-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteId(a.id)}
                                className="text-[11px] text-slate-600 hover:text-red-400 border border-transparent hover:border-red-500/20 px-2 py-1 rounded-lg transition-all">
                                🗑
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total} artikel
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="text-xs px-3 py-1.5 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 transition-all">← Prev</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`text-xs px-3 py-1.5 border rounded-lg transition-all ${p === page ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"}`}>
                          {p + 1}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="text-xs px-3 py-1.5 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-30 transition-all">Next →</button>
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
