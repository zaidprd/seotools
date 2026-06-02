import Link from "next/link";
import { getPosts, urlFor, SanityPost } from "@/lib/sanity";

export const revalidate = 60;

export default async function BlogPage() {
  let posts: SanityPost[] = [];
  try { posts = await getPosts(); } catch { /* Sanity belum dikonfigurasi */ }

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">Beranda</Link>
            <Link href="/dashboard" className="text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2 rounded-lg transition-colors">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-14">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">Blog SEOTulis.AI</p>
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: "Sora,sans-serif" }}>Tips SEO & Konten</h1>
          <p className="text-slate-400">Panduan, tips, dan strategi untuk blogger dan content creator Indonesia</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 border border-slate-800 rounded-2xl">
            <p className="text-4xl mb-4">📰</p>
            <p className="text-slate-400 text-sm mb-2">Belum ada artikel blog</p>
            <p className="text-slate-600 text-xs">Sanity CMS belum dikonfigurasi atau belum ada artikel yang dipublish</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link key={post._id} href={`/blog/${post.slug.current}`}
                className="group bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all hover:-translate-y-0.5">
                {post.coverImage && (
                  <div className="aspect-video overflow-hidden">
                    <img src={urlFor(post.coverImage).width(600).height(340).url()}
                      alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-5">
                  {post.publishedAt && (
                    <p className="text-[11px] text-slate-500 mb-2">
                      {new Date(post.publishedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                      {post.author && ` · ${post.author}`}
                    </p>
                  )}
                  <h2 className="font-bold text-lg text-white mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{post.excerpt}</p>}
                  <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold mt-3 group-hover:gap-2 transition-all">
                    Baca Selengkapnya →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-800/60 py-8 mt-10">
        <div className="max-w-5xl mx-auto px-5 text-center text-xs text-slate-600">
          © 2026 SEOTulis.AI · <Link href="/" className="hover:text-slate-400 transition-colors">Beranda</Link> · <Link href="/pricing" className="hover:text-slate-400 transition-colors">Harga</Link>
        </div>
      </footer>
    </div>
  );
}
