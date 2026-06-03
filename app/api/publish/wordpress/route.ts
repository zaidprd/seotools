import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";
import { checkPlanStatus } from "@/lib/plan-status";

export const runtime = "nodejs";

// Publish artikel ke WordPress via REST API menggunakan Application Password.
// Body: { site: { url, user, pass }, post: { title, content, status } }
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

    const { site, post } = await req.json();
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

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        status: post.status || "draft",
      }),
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
