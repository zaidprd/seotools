import { NextRequest, NextResponse } from "next/server";
import { CREDIT_COST, FREE_MODEL_ID, FREE_ARTICLE_COST, IMAGE_CREDIT_COST } from "@/lib/constants";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime  = "nodejs";
export const maxDuration = 90;

const SYSTEM = "Kamu adalah penulis konten SEO profesional Indonesia terbaik. Tulis konten berkualitas tinggi, informatif, terstruktur dengan baik, dan dioptimasi untuk mesin pencari.";

interface ImageConfig {
  count: number; style: string; instructions: string; userPrompt: string;
  altText: boolean; firstKeyword: boolean; keyword: string; size: string;
}

// Registry provider OpenAI-compatible (proxy). `apiModel` opsional = nama model
// asli yang dikirim ke API (kalau beda dari id internal di UI).
interface OAIProvider { base: string; envKey: string; models: Set<string>; apiModel?: string; }

function oaiProviders(): Record<string, OAIProvider> {
  return {
    // SumoPod = provider utama (OpenAI-compatible, 1 key untuk semua model).
    sumopod: {
      base: process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1",
      envKey: "SUMOPOD_API_KEY",
      models: new Set(["gemini/gemini-2.5-flash", "gpt-5.4", "claude-haiku-4-5", "claude-sonnet-4-6"]),
    },
  };
}

function getProvider(modelId: string): string {
  const oai = oaiProviders();
  for (const [name, p] of Object.entries(oai)) {
    if (p.models.has(modelId)) return name;
  }
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
        const alt = cfg.firstKeyword ? cfg.keyword : cfg.altText ? `${cfg.keyword} ilustrasi` : "";
        result.push("", makeImgTag(images[idx++], alt, cfg.size), "");
      }
    }

    result.push(line);

    if (isH2 && h2Count >= 2 && idx < images.length) {
      const heading = line.replace(/^##\s*/, "");
      const alt = cfg.altText ? `${cfg.keyword} - ${heading}` : "";
      result.push("", makeImgTag(images[idx++], alt, cfg.size), "");
    }
  }

  return result.join("\n");
}

// Whitelist model IDs yang valid untuk mencegah penyalahgunaan
const ALLOWED_MODELS = new Set(Object.keys(CREDIT_COST));

export async function POST(req: NextRequest) {
  try {
    // Verifikasi session — userId selalu dari session, bukan body
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;
    const userId = user.id;

    const { prompt, modelId = FREE_MODEL_ID, aiCleaning = false, imageConfig } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt kosong" }, { status: 400 });

    // Validasi model ID
    const safeModelId = ALLOWED_MODELS.has(modelId) ? modelId : FREE_MODEL_ID;
    const cost = CREDIT_COST[safeModelId] ?? 1;
    const imgCfg: ImageConfig = imageConfig || { count: 0, style: "Foto", instructions: "", userPrompt: "", altText: true, firstKeyword: true, keyword: "", size: "Sedang 800px" };
    const imgCount = Math.min(imgCfg.count || 0, 6);

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: userData } = await supabase
      .from("users")
      .select("credits, plan, credits_used, articles_used, plan_expires_at, role")
      .eq("id", userId)
      .single();

    if (!userData) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    // Admin/owner bypass — skip semua cek kredit, plan, dan expiry
    const isAdmin = userData.role === "admin";

    // Cek plan expiry — jika sudah expired, turunkan ke free
    const planIsActive = isAdmin || !userData.plan_expires_at || new Date(userData.plan_expires_at) > new Date();
    const effectivePlan = isAdmin
      ? "pro"
      : (userData.plan && userData.plan !== "free" && planIsActive) ? userData.plan : "free";

    const isFreePlan = effectivePlan === "free";
    const effectiveCost = isFreePlan ? FREE_ARTICLE_COST : cost;
    const imageCost = (!isFreePlan && imgCount > 0) ? imgCount : 0;
    const totalCost = effectiveCost + imageCost;

    if (!isAdmin) {
      // Atomic credit deduction via RPC — mencegah race condition
      // Jalankan migration: supabase/migrations/20260604_security_fixes.sql
      const { data: deductResult, error: rpcError } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: totalCost,
      });

      if (rpcError) {
        // Fallback jika fungsi RPC belum diinstall
        console.error("[generate] RPC deduct_credits tidak tersedia, jalankan migration SQL:", rpcError.message);
        if ((userData.credits ?? 0) < totalCost) {
          return NextResponse.json(
            { error: `Kredit tidak cukup. Butuh ${totalCost} 💎, kamu punya ${userData.credits ?? 0} 💎.` },
            { status: 402 }
          );
        }
        await supabase.from("users").update({
          credits: userData.credits - totalCost,
          credits_used: (userData.credits_used ?? 0) + totalCost,
          articles_used: (userData.articles_used ?? 0) + 1,
        }).eq("id", userId);
      } else {
        const result = deductResult as { success: boolean; credits: number };
        if (!result?.success) {
          return NextResponse.json(
            { error: `Kredit tidak cukup. Butuh ${totalCost} 💎, kamu punya ${result?.credits ?? 0} 💎.` },
            { status: 402 }
          );
        }
      }
    }

    // Generate article text
    const provider = getProvider(safeModelId);
    let text = "";

    const oai = oaiProviders();
    if (oai[provider]) {
      const cfg = oai[provider];
      const key = process.env[cfg.envKey];
      if (!key) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });
      const r = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: cfg.apiModel || safeModelId, max_tokens: 4000,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "(no body)");
        console.error(`[generate] ${provider} error ${r.status}:`, errText);
        return NextResponse.json({ error: `Provider error (${r.status}): ${errText.slice(0, 200)}` }, { status: 502 });
      }
      const data = await r.json();
      text = data.choices?.[0]?.message?.content || "";

    } else if (provider === "google") {
      const key = process.env.GOOGLE_API_KEY;
      if (!key) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${safeModelId}:generateContent?key=${key}`,
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
      if (!r.ok) {
        const errText = await r.text().catch(() => "(no body)");
        console.error(`[generate] google error ${r.status}:`, errText);
        return NextResponse.json({ error: `Google API error (${r.status})` }, { status: 502 });
      }
      const data = await r.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: safeModelId, max_tokens: 4000,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "(no body)");
        console.error(`[generate] openai error ${r.status}:`, errText);
        return NextResponse.json({ error: `OpenAI error (${r.status})` }, { status: 502 });
      }
      const data = await r.json();
      text = data.choices?.[0]?.message?.content || "";

    } else {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": "Artikel SEO",
        },
        body: JSON.stringify({
          model: safeModelId, max_tokens: 4000,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "(no body)");
        console.error(`[generate] openrouter error ${r.status}:`, errText);
        return NextResponse.json({ error: `OpenRouter error (${r.status})` }, { status: 502 });
      }
      const data = await r.json();
      text = data.choices?.[0]?.message?.content || "";
    }

    if (aiCleaning) text = cleanAIContent(text);

    // Generate & insert images (paid plans only)
    if (imgCount > 0 && !isFreePlan && text) {
      try {
        const key = process.env.GOOGLE_API_KEY;
        if (key) {
          const images: string[] = [];
          for (let i = 0; i < imgCount; i++) {
            const imgPrompt = imgCfg.userPrompt
              ? `Professional photo of ${imgCfg.keyword}, ${imgCfg.userPrompt}, high quality, blog article`
              : [imgCfg.keyword, imgCfg.style, "high quality blog illustration", imgCfg.instructions].filter(Boolean).join(", ");
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
    if (text) {
      try {
        const wordCount = text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        const titleMatch = text.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : text.slice(0, 80).trim();
        const keywordMatch = prompt.match(/[Kk]eyword[^:]*:\s*"?([^"\n]+)"?/);
        const keyword = keywordMatch ? keywordMatch[1].trim() : imgCfg.keyword || "";

        await supabase.from("articles").insert({
          user_id: userId, title, keyword,
          model_id: safeModelId, content: text,
          word_count: wordCount, credits_used: isAdmin ? 0 : cost + (!isFreePlan ? imageCost : 0),
        });
      } catch { /* silently ignore history save errors */ }
    }

    return NextResponse.json({ text, creditsUsed: isAdmin ? 0 : totalCost });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate] unhandled error:", msg);
    return NextResponse.json({ error: `Generate gagal: ${msg}` }, { status: 500 });
  }
}
