import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateOutboundUrl } from "@/lib/validate-url";

export const runtime = "nodejs";

/**
 * GET /api/fetch-sitemap?url=https://example.com/sitemap.xml
 * Fetch dan parse sitemap XML, kembalikan daftar URL halaman.
 */
export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const sitemapUrl = req.nextUrl.searchParams.get("url");
    if (!sitemapUrl) return NextResponse.json({ error: "Parameter url diperlukan" }, { status: 400 });

    // Validasi URL untuk mencegah SSRF
    const urlCheck = validateOutboundUrl(sitemapUrl);
    if (!urlCheck.safe) return NextResponse.json({ error: `URL tidak valid: ${urlCheck.reason}` }, { status: 400 });

    const r = await fetch(sitemapUrl, {
      headers: { "User-Agent": "ArtikelSEO/1.0 (sitemap fetcher)" },
      signal: AbortSignal.timeout(10000),
    });

    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const xml = await r.text();

    // Parse <loc> tags dari sitemap XML
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
      .map(m => m[1].trim())
      .filter(url => {
        // Filter: skip gambar, feed, dan file non-html
        const lower = url.toLowerCase();
        return !lower.match(/\.(jpg|jpeg|png|gif|svg|pdf|xml|rss|atom)$/);
      })
      .slice(0, 100); // Maks 100 halaman

    if (locs.length === 0) {
      return NextResponse.json({ error: "Tidak ada URL ditemukan di sitemap (format tidak dikenali atau sitemap kosong)" }, { status: 400 });
    }

    // Format untuk textarea: satu URL per baris
    const pages = locs.join("\n");
    return NextResponse.json({ pages, count: locs.length });

  } catch (e: any) {
    const msg = e.name === "TimeoutError" ? "Timeout — sitemap tidak merespons dalam 10 detik" : "Gagal mengambil sitemap";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
