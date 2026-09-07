import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";
import { checkPlanStatus } from "@/lib/plan-status";
import { replaceJsonLdWithArticleSchema } from "@/lib/wp-publish";

export const runtime = "nodejs";

async function uploadDataImage(dataUrl: string, origin: string, auth: string, filenamePrefix: string): Promise<number | undefined> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!match) return undefined;
  const mime = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 100) return undefined;
  const response = await fetch(`${origin}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filenamePrefix}-${Date.now()}.${ext}"`,
    },
    body: buffer,
  });
  if (!response.ok) throw new Error("WordPress gagal mengunggah featured image");
  const data = await response.json();
  return typeof data?.id === "number" ? data.id : undefined;
}

// Upload semua gambar base64 (raster) di konten ke WP Media Library — dijalankan di SERVER
// agar tidak terkena pembatasan CORS browser. Ganti src menjadi URL WordPress tanpa
// menjadikannya featured image. SVG base64 dikonversi lebih dahulu di client.
async function uploadBase64Images(
  content: string, origin: string, auth: string
): Promise<string> {
  const regex = /<img([^>]*?)src="data:([^;]+);base64,([^"]+)"([^>]*?)>/gi;
  const matches = [...content.matchAll(regex)];
  let result = content;
  const extByMime: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/gif": "gif", "image/webp": "webp",
  };
  for (const m of matches) {
    const mime = m[2].toLowerCase();
    if (mime === "image/svg+xml" || !extByMime[mime]) continue; // SVG/unknown dilewati
    try {
      const buf = Buffer.from(m[3], "base64");
      if (buf.length < 100) continue;
      const filename = `artikel-seo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extByMime[mime]}`;
      const r = await fetch(`${origin}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
        body: buf,
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.source_url) result = result.replace(m[0], `<img${m[1]}src="${data.source_url}"${m[4]}>`);
    } catch { /* pertahankan base64 jika upload gagal */ }
  }
  return result;
}

// Publish artikel ke WordPress via REST API menggunakan Application Password.
// Body: { site: { url, user, pass }, post: { title, content, status, slug, ... } }
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const planStatus = await checkPlanStatus(user.id);
    if (!planStatus.isAdmin && (planStatus.plan === "free" || planStatus.isExpired)) {
      return NextResponse.json(
        { error: "Publish ke WordPress memerlukan paket aktif." },
        { status: 403 }
      );
    }

    const { site, post }: {
      site: { url: string; user: string; pass: string };
      post: { title: string; content: string; status?: string; slug?: string; scheduledAt?: string; focusKeyword?: string; featuredMediaId?: number; featuredImageDataUrl?: string };
    } = await req.json();
    if (!site?.url || !site?.user || !site?.pass) {
      return NextResponse.json({ error: "Data koneksi WordPress tidak lengkap" }, { status: 400 });
    }

    // Validasi URL untuk mencegah SSRF
    const urlCheck = validateOutboundUrl(site.url);
    if (!urlCheck.safe) {
      return NextResponse.json({ error: `URL tidak valid: ${urlCheck.reason}` }, { status: 400 });
    }

    const auth = Buffer.from(`${site.user}:${site.pass}`).toString("base64");
    const endpoint = `${urlCheck.url.origin}/wp-json/wp/v2/posts`;

    // Upload featured image dan gambar body secara terpisah.
    let content = post.content;
    // Do not publish JSON-LD supplied by the client. Rebuild the constrained schema
    // from the final content after image processing instead.
    let featuredMediaId = post.featuredMediaId;
    if (!featuredMediaId && post.featuredImageDataUrl) {
      featuredMediaId = await uploadDataImage(post.featuredImageDataUrl, urlCheck.url.origin, auth, "featured-artikel");
      if (!featuredMediaId) return NextResponse.json({ error: "Format featured image tidak valid" }, { status: 400 });
    }
    if (/<img[^>]+src="data:[^"]+;base64,/.test(content)) {
      content = await uploadBase64Images(content, urlCheck.url.origin, auth);
    }
    content = replaceJsonLdWithArticleSchema(content, post.title, post.focusKeyword);

    const wpBody: Record<string, unknown> = {
      title: post.title,
      content,
      status: post.status || "draft",
    };
    if (post.slug) wpBody.slug = post.slug;
    if (post.status === "future") {
      if (!post.scheduledAt) return NextResponse.json({ error: "Waktu jadwal wajib diisi" }, { status: 400 });
      const scheduled = new Date(post.scheduledAt);
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Jadwal harus berupa waktu yang valid di masa depan" }, { status: 400 });
      }
      wpBody.date = post.scheduledAt;
    }
    if (featuredMediaId) wpBody.featured_media = featuredMediaId;

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(wpBody),
    });

    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: data?.message || "WordPress menolak request" }, { status: r.status });
    }

    return NextResponse.json({ success: true, id: data.id, link: data.link, status: data.status });
  } catch {
    return NextResponse.json({ error: "Gagal terhubung ke WordPress" }, { status: 500 });
  }
}
