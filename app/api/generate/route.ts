import { NextRequest, NextResponse } from "next/server";
import { CREDIT_COST, FREE_MODEL_ID, FREE_MAX_WORDS } from "@/lib/constants";
import { createClient } from "@supabase/supabase-js";

export const runtime  = "nodejs";
export const maxDuration = 60;

const SYSTEM = "Kamu adalah penulis konten SEO profesional Indonesia terbaik. Tulis konten berkualitas tinggi, informatif, terstruktur dengan baik, dan dioptimasi untuk mesin pencari.";

function getProvider(modelId: string): "google" | "openrouter" | "openai" {
  if (modelId.startsWith("gemini")) return "google";
  if (modelId.startsWith("gpt-"))   return "openai";
  return "openrouter"; // deepseek dll
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

export async function POST(req: NextRequest) {
  try {
    const { prompt, modelId = FREE_MODEL_ID, aiCleaning = false, userId } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt kosong" }, { status: 400 });

    const cost = CREDIT_COST[modelId] ?? 1;

    // Cek & kurangi kredit kalau ada userId
    if (userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: user } = await supabase
        .from("users").select("credits, plan, credits_used, articles_used").eq("id", userId).single();

      if (!user || user.credits < cost) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Butuh ${cost} 💎, kamu punya ${user?.credits ?? 0} 💎. Silakan upgrade.` },
          { status: 402 }
        );
      }

      // Kurangi kredit
      await supabase.from("users").update({
        credits: user.credits - cost,
        credits_used: (user.credits_used ?? 0) + cost,
        articles_used: (user.articles_used ?? 0) + 1,
      }).eq("id", userId);
    }

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
      // OpenRouter (DeepSeek dll)
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

    // Simpan riwayat artikel
    if (userId && text) {
      try {
        const sbSave = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const titleMatch = text.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : text.slice(0, 80).trim();
        const keywordMatch = prompt.match(/[Kk]eyword[^:]*:\s*"?([^"\n]+)"?/);
        const keyword = keywordMatch ? keywordMatch[1].trim() : "";

        await sbSave.from("articles").insert({
          user_id: userId, title, keyword,
          model_id: modelId, content: text,
          word_count: wordCount, credits_used: cost,
        });
      } catch { /* silently ignore DB errors */ }
    }

    return NextResponse.json({ text, creditsUsed: cost });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
