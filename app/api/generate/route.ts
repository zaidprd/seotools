import { NextRequest, NextResponse } from "next/server";
import { CREDIT_COST, FREE_MODEL_ID, FREE_ARTICLE_COST, IMAGE_CREDIT_COST, MODEL_FALLBACK } from "@/lib/constants";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime  = "nodejs";
export const maxDuration = 90;

const SYSTEM = `Kamu adalah SEO content writer senior yang spesialis membuat artikel yang dikutip Google AI Overviews dan Gemini. Terapkan prinsip E-E-A-T: tunjukkan keahlian, cantumkan sumber untuk setiap data numerik, tulis kalimat deklaratif yang langsung menjawab intent pembaca. Jangan pernah memulai dengan "Tentu", "Baik", "Berikut adalah", "Halo pembaca", atau frase basa-basi lainnya. Langsung ke konten.`;

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
      models: new Set([
        "gemini/gemini-2.5-flash-lite",
        "gemini/gemini-2.5-flash",
        "gpt-4.1-mini",
        "gpt-4.1",
        "gpt-5.4",
        "claude-haiku-4-5",
        "claude-sonnet-4-6",
        "claude-opus-4-7",
      ]),
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
    // Strip AI opener lines
    .replace(/^(Tentu|Baik|Berikut|Berikut adalah|Tentu saja|Dengan senang hati|Saya akan|Ini adalah|Di bawah ini|Artikel berikut|Berikut ini).{0,150}\n\n/i, "")
    // Strip AI closer lines
    .replace(/\n\n(Semoga|Demikian|Sekian|Itulah|Dengan demikian|Semoga artikel ini|Itulah tadi|Demikianlah).{0,250}$/i, "")
    // Strip meta commentary
    .replace(/\*?Catatan\*?:.{0,300}\n/gi, "")
    .replace(/\*?Disclaimer\*?:.{0,300}\n/gi, "")
    .replace(/\*?Perhatian\*?:.{0,300}\n/gi, "")
    // Remove "Artikel ini membahas..." type meta-sentences
    .replace(/Artikel ini (membahas|akan membahas|menjelaskan|mengulas).{0,200}[.!]\n?/gi, "")
    // Replace overused AI filler phrases
    .replace(/penting untuk diperhatikan bahwa /gi, "")
    .replace(/tidak kalah penting(nya)?[,]?\s*/gi, "")
    .replace(/perlu (dicatat|diperhatikan|diingat) bahwa /gi, "")
    .replace(/dalam hal ini[,]?\s*/gi, "")
    .replace(/pada dasarnya[,]?\s*/gi, "")
    .replace(/secara keseluruhan[,]?\s*/gi, "")
    .replace(/memainkan peran (penting|krusial|vital)/gi, "berperan")
    .replace(/menjadi kunci (utama|keberhasilan)/gi, "menjadi faktor penentu")
    .replace(/tidak bisa dipungkiri (bahwa )?/gi, "")
    .replace(/sudah bukan rahasia (lagi )?/gi, "")
    .replace(/di era (modern|digital) ini[,]?\s*/gi, "")
    .replace(/seiring (perkembangan|berjalannya) (zaman|waktu|teknologi)[,]?\s*/gi, "")
    // Normalize whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function imgWidthAttr(size: string): string {
  const m = size?.match(/(\d+)px/);
  return m ? ` width="${m[1]}"` : "";
}

function makeSvgImgTag(svgB64: string, alt: string, size: string): string {
  return `<img src="data:image/svg+xml;base64,${svgB64}" alt="${alt}"${imgWidthAttr(size)} style="max-width:100%;height:auto;display:block;margin:1em auto;border-radius:8px" />`;
}

function makeRasterImgTag(b64Jpeg: string, alt: string, size: string): string {
  return `<img src="data:image/jpeg;base64,${b64Jpeg}" alt="${alt}"${imgWidthAttr(size)} style="max-width:100%;height:auto;display:block;margin:1em auto;border-radius:8px" />`;
}

// Sisipkan tag <img> yang sudah jadi: 1 sebelum H2 pertama, sisanya setelah tiap H2 berikutnya.
function insertImageTags(content: string, tags: string[]): string {
  if (!tags.length) return content;
  const lines = content.split("\n");
  const result: string[] = [];
  let idx = 0;
  let h2Count = 0;

  for (const line of lines) {
    const isH2 = /^## /.test(line);
    if (isH2) {
      h2Count++;
      if (h2Count === 1 && idx < tags.length) result.push("", tags[idx++], "");
    }
    result.push(line);
    if (isH2 && h2Count >= 2 && idx < tags.length) result.push("", tags[idx++], "");
  }
  return result.join("\n");
}

// PRIMARY: Cloudflare Workers AI (flux-1-schnell) → foto raster base64 JPEG. null jika gagal/tak dikonfigurasi.
async function genCloudflareImage(prompt: string): Promise<string | null> {
  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!acct || !token) return null;
  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 6 }),
      }
    );
    if (!r.ok) {
      console.error(`[generate] cloudflare image error ${r.status}:`, (await r.text().catch(() => "")).slice(0, 160));
      return null;
    }
    const d = await r.json();
    const b64 = d?.result?.image;
    return typeof b64 === "string" && b64.length > 100 ? b64 : null;
  } catch (e) {
    console.error("[generate] cloudflare image exception:", e instanceof Error ? e.message : e);
    return null;
  }
}

// FALLBACK: SVG ilustrasi via SumoPod. Return kode SVG mentah atau null.
async function genSvgImage(cfg: ImageConfig): Promise<string | null> {
  const spKey = process.env.SUMOPOD_API_KEY;
  const spBase = (process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1").replace(/\/$/, "");
  if (!spKey) return null;
  const kw = cfg.keyword || "";
  const svgSysPrompt = `Kamu adalah generator ilustrasi SVG profesional untuk artikel blog SEO. Kembalikan HANYA kode SVG mentah, mulai dari <svg hingga </svg>. Gunakan viewBox="0 0 800 450", warna modern dan harmonis, tambahkan teks/label bahasa Indonesia jika relevan. JANGAN ada markdown, penjelasan, atau teks apapun di luar tag SVG.`;
  const svgPrompt = cfg.userPrompt
    ? `Ilustrasi SVG untuk artikel tentang "${kw}": ${cfg.userPrompt}`
    : `Ilustrasi SVG untuk artikel tentang "${kw}". Style: ${cfg.style || "Ilustrasi"}. ${cfg.instructions || ""}`.trim();
  try {
    const r = await fetch(`${spBase}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${spKey}` },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: svgSysPrompt }, { role: "user", content: svgPrompt }],
        max_tokens: 4000,
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    let raw: string = d.choices?.[0]?.message?.content ?? "";
    raw = raw.replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/, "").trim();
    const match = raw.match(/<svg[\s\S]*<\/svg>/i);
    return match ? match[0] : null;
  } catch { return null; }
}

// Panggil 1 model ke provider yang sesuai. Tidak melempar — selalu balas {text,error?}.
// JSON di-parse aman (SumoPod kadang balas teks non-JSON untuk Claude → ditangani).
async function callModel(modelId: string, prompt: string, outTokens: number): Promise<{ text: string; error?: string; status?: number }> {
  const provider = getProvider(modelId);
  const oai = oaiProviders();
  try {
    if (oai[provider]) {
      const cfg = oai[provider];
      const key = process.env[cfg.envKey];
      if (!key) return { text: "", error: "Konfigurasi server tidak lengkap", status: 500 };
      const r = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: cfg.apiModel || modelId, max_tokens: outTokens,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      const raw = await r.text();
      if (!r.ok) {
        console.error(`[generate] ${provider} ${modelId} error ${r.status}:`, raw.slice(0, 200));
        return { text: "", error: `Provider error (${r.status})`, status: 502 };
      }
      let data: any;
      try { data = JSON.parse(raw); }
      catch { console.error(`[generate] ${modelId} respons non-JSON:`, raw.slice(0, 160)); return { text: "", error: "Respons provider tidak valid", status: 502 }; }
      return { text: data.choices?.[0]?.message?.content || "" };

    } else if (provider === "google") {
      const key = process.env.GOOGLE_API_KEY;
      if (!key) return { text: "", error: "Konfigurasi server tidak lengkap", status: 500 };
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: outTokens },
          }),
        }
      );
      if (!r.ok) {
        console.error(`[generate] google ${modelId} error ${r.status}:`, (await r.text().catch(() => "")).slice(0, 200));
        return { text: "", error: `Google API error (${r.status})`, status: 502 };
      }
      const data = await r.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "" };

    } else if (provider === "openai") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return { text: "", error: "Konfigurasi server tidak lengkap", status: 500 };
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model: modelId, max_tokens: outTokens,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        console.error(`[generate] openai ${modelId} error ${r.status}:`, (await r.text().catch(() => "")).slice(0, 200));
        return { text: "", error: `OpenAI error (${r.status})`, status: 502 };
      }
      const data = await r.json();
      return { text: data.choices?.[0]?.message?.content || "" };

    } else {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return { text: "", error: "Konfigurasi server tidak lengkap", status: 500 };
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": "Artikel SEO",
        },
        body: JSON.stringify({
          model: modelId, max_tokens: outTokens,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        console.error(`[generate] openrouter ${modelId} error ${r.status}:`, (await r.text().catch(() => "")).slice(0, 200));
        return { text: "", error: `OpenRouter error (${r.status})`, status: 502 };
      }
      const data = await r.json();
      return { text: data.choices?.[0]?.message?.content || "" };
    }
  } catch (e) {
    return { text: "", error: e instanceof Error ? e.message : "fetch error", status: 502 };
  }
}

// Whitelist model IDs yang valid untuk mencegah penyalahgunaan
const ALLOWED_MODELS = new Set(Object.keys(CREDIT_COST));

export async function POST(req: NextRequest) {
  try {
    // Verifikasi session — userId selalu dari session, bukan body
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;
    const userId = user.id;

    const { prompt, modelId = FREE_MODEL_ID, aiCleaning = false, imageConfig, maxTokens } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt kosong" }, { status: 400 });

    // Output token sesuai panjang artikel (dari client), clamp 500–8000 agar long-form tak terpotong
    const outTokens = Math.min(Math.max(Number(maxTokens) || 4000, 500), 8000);

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

    // Generate article text — auto-fallback kalau model utama error/kosong (mis. Claude tak stabil)
    let usedModel = safeModelId;
    let res = await callModel(safeModelId, prompt, outTokens);
    let text = res.text;
    if (!text && MODEL_FALLBACK[safeModelId]) {
      const fb = MODEL_FALLBACK[safeModelId];
      console.warn(`[generate] ${safeModelId} gagal (${res.error || "kosong"}) → fallback ke ${fb}`);
      const res2 = await callModel(fb, prompt, outTokens);
      if (res2.text) { text = res2.text; usedModel = fb; }
      else res = res2;
    }

    // Total gagal (utama + fallback) → refund kredit, jangan biarkan user kehilangan kredit
    if (!text) {
      if (!isAdmin) {
        try { await supabase.rpc("refund_credit", { p_user_id: userId, p_amount: totalCost }); } catch { /* best effort */ }
      }
      return NextResponse.json({ error: res.error || "Model tidak menghasilkan konten" }, { status: res.status || 502 });
    }

    if (aiCleaning) text = cleanAIContent(text);

    // Generate & insert gambar (paid plans). Utama: Cloudflare Flux (foto) → fallback SVG.
    if (imgCount > 0 && !isFreePlan && text) {
      try {
        const kw = imgCfg.keyword || "";
        const desc = imgCfg.userPrompt || `${imgCfg.style || "Foto"}. ${imgCfg.instructions || ""}`.trim();
        const cfPrompt = `High-quality ${(imgCfg.style || "photo").toLowerCase()} illustration for an article about "${kw}". ${desc}`.trim();
        const tags: string[] = [];
        for (let i = 0; i < imgCount; i++) {
          const alt = i === 0 && imgCfg.firstKeyword
            ? kw
            : imgCfg.altText ? `${kw} - ilustrasi ${i + 1}` : "";
          // 1) Cloudflare (utama)
          const raster = await genCloudflareImage(cfPrompt);
          if (raster) { tags.push(makeRasterImgTag(raster, alt, imgCfg.size)); continue; }
          // 2) SVG (fallback otomatis)
          const svg = await genSvgImage(imgCfg);
          if (svg) tags.push(makeSvgImgTag(Buffer.from(svg).toString("base64"), alt, imgCfg.size));
        }
        if (tags.length > 0) text = insertImageTags(text, tags);
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
          model_id: usedModel, content: text,
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
