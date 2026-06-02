import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt diperlukan" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: user } = await sb.from("users").select("plan, credits").eq("id", userId).single();

    if (!user || !user.plan || user.plan === "free") {
      return NextResponse.json({ error: "Gambar AI hanya untuk paket berbayar. Silakan upgrade ke Starter/Pro/Agency." }, { status: 403 });
    }
    if ((user.credits ?? 0) < 1) {
      return NextResponse.json({ error: "Kredit tidak cukup (butuh 1 💎 untuk generate gambar)" }, { status: 402 });
    }

    // Deduct 1 credit
    await sb.from("users").update({ credits: user.credits - 1 }).eq("id", userId);

    const key = process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "GOOGLE_API_KEY belum dikonfigurasi" }, { status: 500 });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "4:3" },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) {
      // Refund credit on API error
      await sb.from("users").update({ credits: user.credits }).eq("id", userId);
      throw new Error(data?.error?.message || "Imagen API error");
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    const mimeType = data.predictions?.[0]?.mimeType || "image/png";

    if (!b64) throw new Error("Gambar tidak berhasil digenerate — coba prompt yang berbeda");

    return NextResponse.json({ image: b64, mimeType, creditsUsed: 1 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Terjadi kesalahan" }, { status: 500 });
  }
}
