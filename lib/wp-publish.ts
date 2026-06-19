import { marked } from "marked";
import DOMPurify from "dompurify";
import { WPSite } from "./constants";

marked.setOptions({ breaks: true, gfm: true } as any);

// Ambil judul dari H1 markdown (baris pertama "# ..."). Fallback: 60 karakter awal.
export function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : md.slice(0, 60).trim();
}

// Konversi markdown artikel → HTML siap-WordPress.
// H1 pertama dibuang (dikirim terpisah sebagai judul post), begitu juga baris META.
export function markdownToHtml(md: string): string {
  const body = md
    .replace(/^#\s+.+$/m, "")          // buang H1 pertama → jadi judul post
    .replace(/^\s*META:\s*.+$/im, "")  // buang baris meta description
    .trim();
  try {
    const html = marked.parse(body) as string;
    return typeof window === "undefined" ? html : DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    return body;
  }
}

// Konversi SVG base64 → WebP via Canvas (agar WordPress tidak butuh plugin SVG).
function svgToWebP(svgB64: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800; canvas.height = 450;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no canvas ctx")); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 450);
      ctx.drawImage(img, 0, 0, 800, 450);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/webp", 0.92);
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${svgB64}`;
  });
}

// Upload semua gambar base64 di HTML ke WP Media Library, ganti src jadi URL WP.
// SVG otomatis dikonversi ke WebP. Return HTML baru + ID gambar pertama (featured image).
export async function uploadImagesToWP(
  html: string, site: WPSite
): Promise<{ html: string; firstMediaId?: number }> {
  const regex = /<img([^>]*?)src="(data:([^;]+);base64,([^"]+))"([^>]*?)>/gi;
  let result = html;
  let firstMediaId: number | undefined;
  const matches: Array<{ full: string; pre: string; mime: string; b64: string; post: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push({ full: m[0], pre: m[1], mime: m[3], b64: m[4], post: m[5] });
  }
  for (const im of matches) {
    try {
      let blob: Blob;
      let filename: string;
      if (im.mime === "image/svg+xml") {
        blob = await svgToWebP(im.b64);
        filename = `artikel-seo-img-${Date.now()}.webp`;
      } else {
        const byteStr = atob(im.b64);
        const bytes = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
        blob = new Blob([bytes], { type: im.mime });
        const ext: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
        filename = `artikel-seo-img-${Date.now()}.${ext[im.mime] || "png"}`;
      }
      const file = new File([blob], filename, { type: blob.type });
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${site.url.replace(/\/+$/, "")}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${site.user}:${site.pass}`)}`,
          "Content-Disposition": `attachment; filename="${file.name}"`,
        },
        body: fd,
      });
      if (r.ok) {
        const data = await r.json();
        if (!firstMediaId) firstMediaId = data.id as number;
        result = result.replace(im.full, `<img${im.pre}src="${data.source_url}"${im.post}>`);
      }
    } catch { /* pertahankan base64 jika upload gagal */ }
  }
  return { html: result, firstMediaId };
}

// Bangun structured data JSON-LD (Article + FAQPage) dari markdown artikel.
// FAQ diambil dari pasangan "**P: ...?**" / "**A:** ...". Hasilnya tag <script> siap
// ditempel ke akhir konten WordPress — sinyal kuat untuk rich result & AI Overview 2026.
export function buildJsonLd(md: string, title: string, keyword?: string): string {
  const faqs: { q: string; a: string }[] = [];
  const re = /\*\*P:\s*([^*\n]+?)\*\*\s*\n+\s*\*\*A:\*\*\s*([\s\S]*?)(?=\n\s*\*\*P:|\n#{1,3}\s|\n\n\n|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const q = m[1].trim().replace(/\s+/g, " ");
    const a = m[2].trim().replace(/[*_#>]/g, "").replace(/\s+/g, " ");
    if (q && a) faqs.push({ q, a });
  }
  const graph: Record<string, unknown>[] = [{
    "@type": "Article",
    headline: title.slice(0, 110),
    ...(keyword ? { keywords: keyword } : {}),
    dateModified: new Date().toISOString().slice(0, 10),
  }];
  if (faqs.length >= 2) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  return `\n<script type="application/ld+json">${json}</script>`;
}

// Hitung waktu tayang terjadwal untuk artikel ke-`index` (0-based).
// Drip: `perDay` artikel/hari, jeda antar artikel = 24 jam / perDay, mulai dari `startLocal`.
// Return string waktu lokal "YYYY-MM-DDTHH:MM:SS" (format yang dipahami WordPress).
export function computeScheduleDate(startLocal: string, perDay: number, index: number): string {
  const start = new Date(startLocal);
  const gapMs = (24 * 3600 * 1000) / Math.max(1, perDay);
  const d = new Date(start.getTime() + index * gapMs);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
