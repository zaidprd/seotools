import { Config, FREE_MODEL_ID } from "./constants";
import { buildPrompt, buildTitlePrompt } from "./prompt";

export interface GenerateResult {
  text: string;
  svgsGenerated?: number;
  svgError?: string;
}

export async function generateArticle(cfg: Config & { modelId?: string; userId?: string }): Promise<GenerateResult> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: buildPrompt(cfg),
      modelId: cfg.modelId,
      userId: cfg.userId,
      aiCleaning: cfg.aiCleaning,
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
  return {
    text: data.text || "Gagal menghasilkan konten.",
    svgsGenerated: data.svgsGenerated ?? 0,
    svgError: data.svgError,
  };
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
  post: { title: string; content: string; status: string; scheduledAt?: string; focusKeyword?: string; slug?: string }
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
