import { Config } from "./constants";
import type { GeneratedArticle } from "./generation/types";

// Perkiraan output token sesuai target panjang artikel.
// Teks Indonesia ≈ 2 token/kata, ditambah headroom untuk FAQ/kesimpulan.
// Dikirim ke server agar artikel panjang tidak terpotong di tengah.
function maxTokensFor(articleSize: string): number {
  if (/Mini/i.test(articleSize))     return 1800;
  if (/Pendek/i.test(articleSize))   return 2600;
  if (/Standar/i.test(articleSize))  return 3400;
  if (/Sedang/i.test(articleSize))   return 4800;
  if (/Panjang/i.test(articleSize))  return 6500;
  if (/Maksimal/i.test(articleSize)) return 8000;
  return 4000;
}

export type ArticleResult = GeneratedArticle & { id?: string };

export async function generateArticle(cfg: Config): Promise<ArticleResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...cfg, maxTokens: maxTokensFor(cfg.articleSize) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  if (!data.article) throw new Error("Respons artikel tidak valid");
  return data.article as ArticleResult;
}

export function generateTitlesAPI(keyword: string, count = 5): Promise<string[]> {
  const year = new Date().getFullYear();
  const clean = keyword.trim();
  return Promise.resolve([
    `Panduan ${clean} Terlengkap ${year}`,
    `${clean}: Cara, Tips, dan Kesalahan Umum`,
    `Cara ${clean} yang Efektif untuk Pemula`,
    `7 Strategi ${clean} yang Layak Dicoba`,
    `Apa Itu ${clean}? Panduan Praktis ${year}`,
  ].slice(0, count));
}

export async function publishToWordPress(
  site: { url: string; user: string; pass: string },
  post: { title: string; content: string; status: string; slug?: string; scheduledAt?: string; focusKeyword?: string; featuredMediaId?: number; featuredImageDataUrl?: string }
) {
  const res = await fetch("/api/publish/wordpress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site, post }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Publish gagal (${res.status})`);
  }
  return res.json();
}
