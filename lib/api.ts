import { Config, FREE_MODEL_ID } from "./constants";
import { buildPrompt, buildTitlePrompt } from "./prompt";
import type { AioGenerateRequest, AioGenerateResponse } from "@/app/api/aio-generate/route";

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

export async function generateArticle(cfg: Config & { modelId?: string; userId?: string }): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: buildPrompt(cfg),
      modelId: cfg.modelId,
      userId: cfg.userId,
      aiCleaning: cfg.aiCleaning,
      maxTokens: maxTokensFor(cfg.articleSize),
      imageConfig: {
        count: parseInt(cfg.imgCount || "0"),
        style: cfg.imgStyle || "Foto",
        instructions: cfg.imgInstructions || "",
        userPrompt: cfg.imgPrompt || "",
        altText: cfg.imgAltText !== false,
        firstKeyword: cfg.imgFirstKeyword !== false,
        keyword: cfg.keyword || "",
        size: cfg.imgSize || "Sedang 800px",
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data.text || "Gagal menghasilkan konten.";
}

export async function generateTitlesAPI(keyword: string, count = 5): Promise<string[]> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: buildTitlePrompt(keyword, count), modelId: FREE_MODEL_ID }),
  });
  const data = await res.json();
  return (data.text || "").split("\n").map((t: string) => t.trim()).filter((t: string) => t.length > 10).slice(0, count);
}

export async function publishToWordPress(
  site: { url: string; user: string; pass: string },
  post: { title: string; content: string; status: string; scheduledAt?: string; focusKeyword?: string; featuredMediaId?: number }
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

/**
 * Panggil pipeline AI Overview (7 step + loop 10x) di /api/aio-generate.
 * Return full response AioGenerateResponse (fullMarkdown, fullHtml, schemas, meta,
 * qaScore, stepLogs, dst) supaya caller bisa render di Tiptap + preview schema.
 */
export async function generateAioArticle(req: AioGenerateRequest): Promise<AioGenerateResponse> {
  const res = await fetch("/api/aio-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  if (!data.success) throw new Error(data.error || "Pipeline AIO gagal");
  return data as AioGenerateResponse;
}