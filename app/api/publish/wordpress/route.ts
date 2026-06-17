import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";
import { checkPlanStatus } from "@/lib/plan-status";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function extractMeta(content: string): { body: string; metaDesc: string } {
  // Ekstrak baris META: [...] dari akhir artikel, lalu hapus dari body
  const metaMatch = content.match(/\n?META:\s*(.+?)(?:\n|$)/i);
  const metaDesc = metaMatch ? metaMatch[1].replace(/^\[|\]$/g, "").trim() : "";
  const body = content.replace(/\n?META:\s*.+?(?:\n|$)/gi, "").trimEnd();
  return { body, metaDesc };
}

// Publish artikel ke WordPress via REST API menggunakan Application Password.
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const planStatus = await checkPlanStatus(user.id);
    if (!planStatus.isAdmin && planStatus.plan === "free") {
      return NextResponse.json({ error: "Publish ke WordPress memerlukan paket berbayar." }, { status: 403 });
    }
    if (!planStatus.isAdmin && planStatus.isExpired) {
      return NextResponse.json({ error: "Paket kamu sudah expired. Silakan perpanjang untuk melanjutkan." }, { status: 403 });
    }

    const { site, post } = await req.json();
    if (!site?.url || !site?.user || !site?.pass) {
      return NextResponse.json({ error: "Data koneksi WordPress tidak lengkap" }, { status: 400 });
    }

    const urlCheck = validateOutboundUrl(site.url);
    if (!urlCheck.safe) {
      return NextResponse.json({ error: `URL tidak valid: ${urlCheck.reason}` }, { status: 400 });
    }

    // Ekstrak META description dari body, bersihkan konten
    const { body: cleanContent, metaDesc } = extractMeta(post.content || "");

    const slug = post.slug || slugify(post.title || "");
    const focusKeyword = post.focusKeyword || "";

    // Yoast SEO fields (via custom meta)
    const yoastMeta: Record<string, string> = {};
    if (metaDesc) {
      yoastMeta["_yoast_wpseo_metadesc"] = metaDesc;
    }
    if (focusKeyword) {
      yoastMeta["_yoast_wpseo_focuskw"] = focusKeyword;
    }

    // RankMath SEO fields
    const rankMathMeta: Record<string, string> = {};
    if (metaDesc) {
      rankMathMeta["rank_math_description"] = metaDesc;
    }
    if (focusKeyword) {
      rankMathMeta["rank_math_focus_keyword"] = focusKeyword;
    }

    const auth = Buffer.from(`${site.user}:${site.pass}`).toString("base64");
    const endpoint = `${urlCheck.url.origin}/wp-json/wp/v2/posts`;

    const wpBody: Record<string, unknown> = {
      title: post.title,
      content: cleanContent,
      excerpt: metaDesc,         // WP native excerpt = meta description
      slug,
      status: post.status || "draft",
      meta: { ...yoastMeta, ...rankMathMeta },
    };

    // Scheduled post: kirim date dalam format ISO 8601
    if (post.status === "future" && post.scheduledAt) {
      wpBody.date = new Date(post.scheduledAt).toISOString();
    }

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

    return NextResponse.json({ success: true, id: data.id, link: data.link, status: data.status, metaDesc });
  } catch {
    return NextResponse.json({ error: "Gagal terhubung ke WordPress" }, { status: 500 });
  }
}
