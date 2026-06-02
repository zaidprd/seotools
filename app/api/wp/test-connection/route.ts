import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { url, user, pass } = await req.json();
    if (!url || !user || !pass) {
      return NextResponse.json({ error: "URL, username, dan password wajib diisi" }, { status: 400 });
    }

    const cleanUrl = url.replace(/\/$/, "");
    const r = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
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
  } catch (e: any) {
    return NextResponse.json({ error: `Network error: ${e.message}` }, { status: 500 });
  }
}
