import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";
import { checkPlanStatus } from "@/lib/plan-status";

export const runtime = "nodejs";

// Upload semua gambar base64 (raster) di konten ke WP Media Library — dijalankan di SERVER
// agar tidak terkena pembatasan CORS browser. Ganti src jadi URL WP, dan kembalikan ID
// gambar pertama untuk dijadikan featured image. SVG base64 dilewati (perlu konversi di client).
async function uploadBase64Images(
  content: string, origin: string, auth: string
): Promise<{ content: string; firstMediaId?: number }> {
  const regex = /<img([^>]*?)src="data:([^;]+);base64,([^"]+)"([^>]*?)>/gi;
  const matches = [...content.matchAll(regex)];
  let result = content;
  let firstMediaId: number | undefined;
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
      if (!firstMediaId && data?.id) firstMediaId = data.id as number;
      if (data?.source_url) result = result.replace(m[0], `<img${m[1]}src="${data.source_url}"${m[4]}>`);
    } catch { /* pertahankan base64 jika upload gagal */ }
  }
  return { content: result, firstMediaId };
}

// Publish artikel ke WordPress via REST API menggunakan Application Password.
// Body: { site: { url, user, pass }, post: { title, content, status, slug, ... } }
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    // Cek plan — publish WP memerlukan plan berbayar
    const planStatus = await checkPlanStatus(user.id);
    if (!planStatus.isAdmin && planStatus.plan === "free") {
      return NextResponse.json({ error: "Publish ke WordPress memerlukan paket berbayar." }, { status: 403 });
    }
    if (!planStatus.isAdmin && planStatus.isExpired) {
      return NextResponse.json({ error: "Paket kamu sudah expired. Silakan perpanjang untuk melanjutkan." }, { status: 403 });
    }

    const { site, post }: {
      site: { url: string; user: string; pass: string };
      post: { title: string; content: string; status?: string; slug?: string; scheduledAt?: string; focusKeyword?: string; featuredMediaId?: number };
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

    // Upload gambar base64 ke WP (server-side) → src jadi URL WP, gambar pertama jadi featured image.
    let content = post.content;
    let featuredMediaId = post.featuredMediaId;
    if (/<img[^>]+src="data:[^"]+;base64,/.test(content)) {
      const up = await uploadBase64Images(content, urlCheck.url.origin, auth);
      content = up.content;
      if (!featuredMediaId && up.firstMediaId) featuredMediaId = up.firstMediaId;
    }

    const wpBody: Record<string, unknown> = {
      title: post.title,
      content,
      status: post.status || "draft",
    };
    if (post.slug) wpBody.slug = post.slug;
    if (post.scheduledAt) wpBody.date = post.scheduledAt;
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
