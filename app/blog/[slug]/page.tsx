import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, urlFor } from "@/lib/sanity";
import { PortableText } from "next-sanity";

export const revalidate = 60;

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  let post = null;
  try { post = await getPost(params.slug); } catch {}
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Nav */}
      <nav className="border-b border-slate-800/60 sticky top-0 z-50 bg-[#0c0e14]/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-[#0c0e14] text-sm">S</div>
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: "Sora,sans-serif" }}>
              <span className="text-white">SEO</span><span className="text-amber-400 font-light">Tulis</span><span className="text-amber-500">.AI</span>
            </span>
          </Link>
          <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">← Blog</Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-5 py-12">
        {/* Meta */}
        {post.publishedAt && (
          <p className="text-sm text-slate-500 mb-4">
            {new Date(post.publishedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            {post.author && <> · <span className="text-amber-400/70">{post.author}</span></>}
          </p>
        )}

        <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight" style={{ fontFamily: "Sora,sans-serif" }}>
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg text-slate-400 mb-8 leading-relaxed border-l-2 border-amber-500/40 pl-4">
            {post.excerpt}
          </p>
        )}

        {post.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-10 aspect-video">
            <img src={urlFor(post.coverImage).width(900).height(506).url()}
              alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        {post.body && (
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:font-bold prose-headings:text-white
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-bold
            prose-blockquote:border-amber-500/40 prose-blockquote:text-slate-400
            prose-code:text-amber-300 prose-code:bg-slate-900/80 prose-code:px-1 prose-code:rounded
            prose-li:text-slate-300">
            <PortableText value={post.body} />
          </div>
        )}
      </article>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-5 pb-16">
        <div className="bg-gradient-to-br from-amber-500/15 via-slate-900/40 to-slate-900/60 border border-amber-500/30 rounded-2xl p-8 text-center">
          <p className="font-black text-xl mb-2" style={{ fontFamily: "Sora,sans-serif" }}>Siap Buat Artikel SEO?</p>
          <p className="text-slate-400 text-sm mb-5">Coba SEOTulis.AI gratis — 1 artikel tanpa kartu kredit</p>
          <Link href="/login" className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-black px-7 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25">
            Mulai Gratis →
          </Link>
        </div>
      </div>

      <footer className="border-t border-slate-800/60 py-6">
        <div className="max-w-3xl mx-auto px-5 text-center text-xs text-slate-600">
          © 2026 SEOTulis.AI
        </div>
      </footer>
    </div>
  );
}
