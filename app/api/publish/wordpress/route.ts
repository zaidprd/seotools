import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Publish artikel ke WordPress via REST API menggunakan Application Password.
// Body: { site: { url, user, pass }, post: { title, content, status } }
export async function POST(req: NextRequest) {
  try {
    const { site, post } = await req.json();
    if (!site?.url || !site?.user || !site?.pass) {
      return NextResponse.json({ error: "Data koneksi WordPress tidak lengkap" }, { status: 400 });
    }

    const auth = Buffer.from(`${site.user}:${site.pass}`).toString("base64");
    const endpoint = `${site.url.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Gagal terhubung ke WordPress" }, { status: 500 });
  }
}
