import { NextRequest, NextResponse } from "next/server";
import { CREDIT_COST, FREE_MODEL_ID } from "@/lib/constants";
import { createClient } from "@supabase/supabase-js";

export const runtime  = "nodejs";
export const maxDuration = 90;

const SYSTEM = "Kamu adalah penulis konten SEO profesional Indonesia terbaik. Tulis konten berkualitas tinggi, informatif, terstruktur dengan baik, dan dioptimasi untuk mesin pencari.";

interface ImageConfig {
  count: number; style: string; instructions: string;
  altText: boolean; firstKeyword: boolean; keyword: string; size: string;
}

function getProvider(modelId: string): "google" | "openrouter" | "openai" {
  if (modelId.startsWith("gemini")) return "google";
  if (modelId.startsWith("gpt-"))   return "openai";
  return "openrouter";
}

function cleanAIContent(text: string): string {
  return text
    .replace(/^(Tentu|Baik|Berikut|Berikut adalah|Tentu saja|Dengan senang hati|Saya akan|Ini adalah|Di bawah ini).{0,120}\n\n/i, "")
    .replace(/\n\n(Semoga|Demikian|Sekian|Itulah|Dengan demikian artikel ini).{0,200}$/i, "")
    .replace(/\*?Catatan\*?:.{0,300}\n/gi, "")
    .replace(/\*?Disclaimer\*?:.{0,300}\n/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeImgTag(b64: string, alt: string, size: string): string {
  const m = size?.match(/(\d+)px/);
  const w = m ? ` width="${m[1]}"` : "";
  return `<img src="data:image/png;base64,${b64}" alt="${alt}"${w} style="max-width:100%;height:auto;display:block;margin:1em auto;border-radius:8px" />`;
}

function insertImages(content: string, images: string[], cfg: ImageConfig): string {
  if (!images.length) return content;
  const lines = content.split("\n");
  const result: string[] = [];
  let idx = 0;
  let h2Count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isH2 = /^## /.test(line);

    if (isH2) {
      h2Count++;
      if (h2Count === 1 && idx < images.length) {
        // Insert first image BEFORE the first H2
        const alt = cfg.firstKeyword ? cfg.keyword : cfg.altText ? `${cfg.keyword} ilustrasi` : "";
        result.push("", makeImgTag(images[idx++], alt, cfg.size), "");
      }
    }

    result.push(line);

    if (isH2 && h2Count >= 2 && idx < images.length) {
      // Insert after 2nd+ H2
      const heading = line.replace(/^##\s*/, "");
      const alt = cfg.altText ? `${cfg.keyword} - ${heading}` : "";
      result.push("", makeImgTag(images[idx++], alt, cfg.size), "");
    }
  }

  return result.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, modelId = FREE_MODEL_ID, aiCleaning = false, userId, imageConfig } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt kosong" }, { status: 400 });

    const cost = CREDIT_COST[modelId] ?? 1;
    const imgCfg: ImageConfig = imageConfig || { count: 0, style: "Foto", instructions: "", altText: true, firstKeyword: true, keyword: "", size: "Sedang 800px" };
    const imgCount = Math.min(imgCfg.count || 0, 6);

    let userPlan = "free";

    // Cek & kurangi kredit
    if (userId) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: user } = await supabase
        .from("users").select("credits, plan, credits_used, articles_used").eq("id", userId).single();

      const isFreePlan = !user?.plan || user.plan === "free";
      const imageCost = (!isFreePlan && imgCount > 0) ? imgCount : 0;
      const totalCost = cost + imageCost;

      if (!user || user.credits < totalCost) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Butuh ${totalCost} 💎 (artikel ${cost} + gambar ${imageCost}), kamu punya ${user?.credits ?? 0} 💎.` },
          { status: 402 }
        );
      }

      await supabase.from("users").update({
        credits: user.credits - totalCost,
        credits_used: (user.credits_used ?? 0) + totalCost,
        articles_used: (user.articles_used ?? 0) + 1,
      }).eq("id", userId);

      userPlan = user.plan || "free";
    }

    // Generate article text
    const provider = getProvider(modelId);
    let text = "";

    if (provider === "google") {
      const key = process.env.GOOGLE_API_KEY;
      if (!key) return NextResponse.json({ error: "GOOGLE_API_KEY belum di-set" }, { status: 500 });
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 4000 },
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || "Google error");
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return NextResponse.json({ error: "OPENAI_API_KEY belum di-set" }, { status: 500 });
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: modelId, max_tokens: 4000,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || "OpenAI error");
      text = data.choices?.[0]?.message?.content || "";

    } else {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return NextResponse.json({ error: "OPENROUTER_API_KEY belum di-set" }, { status: 500 });
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": "SEOTulis.AI",
        },
        body: JSON.stringify({
          model: modelId, max_tokens: 4000,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || "OpenRouter error");
      text = data.choices?.[0]?.message?.content || "";
    }

    if (aiCleaning) text = cleanAIContent(text);

    // Generate & insert images (paid plans only)
    if (imgCount > 0 && userPlan !== "free" && text) {
      try {
        const key = process.env.GOOGLE_API_KEY;
        if (key) {
          const images: string[] = [];
          for (let i = 0; i < imgCount; i++) {
            const imgPrompt = [
              imgCfg.keyword,
              imgCfg.style,
              "high quality blog illustration",
              imgCfg.instructions,
            ].filter(Boolean).join(", ");
            try {
              const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    instances: [{ prompt: imgPrompt }],
                    parameters: { sampleCount: 1, aspectRatio: "4:3" },
                  }),
                }
              );
              const d = await r.json();
              if (r.ok && d.predictions?.[0]?.bytesBase64Encoded) {
                images.push(d.predictions[0].bytesBase64Encoded);
              }
            } catch { /* skip failed individual image */ }
          }
          if (images.length > 0) {
            text = insertImages(text, images, imgCfg);
          }
        }
      } catch { /* silently skip image errors */ }
    }

    // Save article history
    if (userId && text) {
      try {
        const sbSave = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const wordCount = text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const titleMatch = text.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : text.slice(0, 80).trim();
        const keywordMatch = prompt.match(/[Kk]eyword[^:]*:\s*"?([^"\n]+)"?/);
        const keyword = keywordMatch ? keywordMatch[1].trim() : imgCfg.keyword || "";

        await sbSave.from("articles").insert({
          user_id: userId, title, keyword,
          model_id: modelId, content: text,
          word_count: wordCount, credits_used: cost + (userPlan !== "free" ? imgCount : 0),
        });
      } catch { /* silently ignore */ }
    }

    return NextResponse.json({ text, creditsUsed: cost });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
