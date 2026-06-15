import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const SVG_CREDIT_COST = 3;

const SVG_SYSTEM_PROMPT = `Kamu adalah generator ilustrasi SVG profesional untuk artikel blog.
Tugasmu: buat ilustrasi SVG yang relevan, bersih, dan menarik berdasarkan deskripsi pengguna.

ATURAN KETAT:
- Kembalikan HANYA kode SVG mentah, mulai dari <svg dan diakhiri </svg>
- JANGAN ada markdown, penjelasan, atau teks lain di luar SVG
- Gunakan viewBox="0 0 800 450" (landscape 16:9)
- Gunakan warna yang harmonis dan modern (hindari terlalu mencolok)
- Buat ilustrasi yang informatif dan relevan dengan topik
- Sertakan teks/label dalam bahasa Indonesia jika perlu
- Gunakan shapes sederhana tapi estetis: rect, circle, path, text, polygon
- Tambahkan <title> dan <desc> untuk aksesibilitas
- Gunakan gradient jika sesuai untuk tampilan lebih modern
- Ukuran font minimal 14px agar terbaca`;

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const userId = user.id;

  const { prompt, keyword } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Deskripsi gambar diperlukan" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData } = await supabase
    .from("users")
    .select("credits, credits_used, plan, plan_expires_at, role")
    .eq("id", userId)
    .single();

  if (!userData) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const isAdmin = userData.role === "admin";

  if (!isAdmin) {
    const planIsActive = !userData.plan_expires_at || new Date(userData.plan_expires_at) > new Date();
    const effectivePlan = (userData.plan && userData.plan !== "free" && planIsActive) ? userData.plan : "free";

    if (effectivePlan === "free") {
      return NextResponse.json(
        { error: "AI SVG hanya tersedia untuk paket berbayar. Upgrade untuk menggunakan fitur ini." },
        { status: 403 }
      );
    }

    const { data: deductResult, error: rpcError } = await supabase.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: SVG_CREDIT_COST,
    });

    if (rpcError) {
      if ((userData.credits ?? 0) < SVG_CREDIT_COST) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Generate SVG butuh ${SVG_CREDIT_COST} 💎, kamu punya ${userData.credits ?? 0} 💎.` },
          { status: 402 }
        );
      }
      await supabase.from("users").update({
        credits: userData.credits - SVG_CREDIT_COST,
        credits_used: (userData.credits_used ?? 0) + SVG_CREDIT_COST,
      }).eq("id", userId);
    } else {
      const result = deductResult as { success: boolean; credits: number };
      if (!result?.success) {
        return NextResponse.json(
          { error: `Kredit tidak cukup. Generate SVG butuh ${SVG_CREDIT_COST} 💎, kamu punya ${result?.credits ?? 0} 💎.` },
          { status: 402 }
        );
      }
    }
  }

  const baseUrl = process.env.JOINBARENG_BASE_URL;
  const apiKey = process.env.JOINBARENG_API_KEY;
  if (!baseUrl || !apiKey) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });

  const userPrompt = keyword
    ? `Buat ilustrasi SVG untuk artikel tentang "${keyword}". Gambar: ${prompt}`
    : `Buat ilustrasi SVG: ${prompt}`;

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: SVG_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "(no body)");
      console.error("[generate-svg] provider error:", r.status, errText);
      return NextResponse.json({ error: `Provider error (${r.status})` }, { status: 502 });
    }

    const data = await r.json();
    let svgText: string = data.choices?.[0]?.message?.content ?? "";

    svgText = svgText.replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/, "").trim();

    if (!svgText.startsWith("<svg")) {
      const match = svgText.match(/<svg[\s\S]*<\/svg>/i);
      if (!match) {
        return NextResponse.json({ error: "AI tidak menghasilkan SVG yang valid, coba deskripsi yang berbeda" }, { status: 422 });
      }
      svgText = match[0];
    }

    return NextResponse.json({ svg: svgText, creditsUsed: isAdmin ? 0 : SVG_CREDIT_COST });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-svg] error:", msg);
    return NextResponse.json({ error: `Gagal generate SVG: ${msg}` }, { status: 500 });
  }
}
