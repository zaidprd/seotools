import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { url, user, pass } = await req.json();
    if (!url || !user || !pass) {
      return NextResponse.json({ error: "URL, username, dan password wajib diisi" }, { status: 400 });
    }

    // Validasi URL untuk mencegah SSRF
    const urlCheck = validateOutboundUrl(url);
    if (!urlCheck.safe) {
      return NextResponse.json({ error: `URL tidak valid: ${urlCheck.reason}` }, { status: 400 });
    }

    const endpoint = `${urlCheck.url.origin}/wp-json/wp/v2/users/me`;
    const r = await fetch(endpoint, {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": "SEOTulis/1.0",
      },
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const msg = errData.message || errData.code || `HTTP ${r.status}`;
      return NextResponse.json({ error: `Koneksi gagal: ${msg}` }, { status: 400 });
    }

    const data = await r.json();
    return NextResponse.json({ ok: true, name: data.name, email: data.email });
  } catch {
    return NextResponse.json({ error: "Gagal terhubung ke WordPress" }, { status: 500 });
  }
}
