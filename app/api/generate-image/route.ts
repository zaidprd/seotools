import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Verifikasi session — userId selalu dari session, bukan body
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;
    const userId = user.id;

    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt diperlukan" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: userData } = await sb.from("users").select("plan, credits, plan_expires_at, role").eq("id", userId).single();

    // Admin/owner bypass — skip semua cek plan dan kredit
    const isAdmin = userData?.role === "admin";

    if (!isAdmin) {
      // Cek plan expiry
      const planIsActive = !userData?.plan_expires_at || new Date(userData.plan_expires_at) > new Date();
      const effectivePlan = (userData?.plan && userData.plan !== "free" && planIsActive) ? userData.plan : "free";

      if (effectivePlan === "free") {
        return NextResponse.json({ error: "Gambar AI hanya untuk paket berbayar. Silakan upgrade ke Starter/Pro/Agency." }, { status: 403 });
      }

      // Atomic credit deduction via RPC — mencegah race condition
      const { data: deductResult, error: rpcError } = await sb.rpc("deduct_image_credit", {
        p_user_id: userId,
      });

      if (rpcError) {
        // Fallback jika RPC belum diinstall
        console.error("[generate-image] RPC deduct_image_credit tidak tersedia:", rpcError.message);
        if ((userData?.credits ?? 0) < 1) {
          return NextResponse.json({ error: "Kredit tidak cukup (butuh 1 💎 untuk generate gambar)" }, { status: 402 });
        }
        await sb.from("users").update({ credits: (userData?.credits ?? 0) - 1 }).eq("id", userId);
      } else {
        const result = deductResult as { success: boolean; credits: number };
        if (!result?.success) {
          return NextResponse.json({ error: "Kredit tidak cukup (butuh 1 💎 untuk generate gambar)" }, { status: 402 });
        }
      }
    }

    const key = process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            responseMimeType: "image/jpeg",
          },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) {
      if (!isAdmin) {
        try {
          await sb.rpc("refund_credit", { p_user_id: userId, p_amount: 1 });
        } catch {
          await sb.from("users").update({ credits: (userData?.credits ?? 1) }).eq("id", userId);
        }
      }
      return NextResponse.json({ error: "Gagal generate gambar, silakan coba lagi" }, { status: 500 });
    }

    // Cari part yang berisi gambar (inlineData dengan mimeType image/*)
    const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imgPart) {
      if (!isAdmin) {
        try { await sb.rpc("refund_credit", { p_user_id: userId, p_amount: 1 }); } catch { /* best effort */ }
      }
      return NextResponse.json({ error: "Gambar tidak berhasil digenerate — coba prompt yang berbeda" }, { status: 500 });
    }

    const b64 = imgPart.inlineData.data as string;
    const mimeType = imgPart.inlineData.mimeType as string;

    return NextResponse.json({ image: b64, mimeType, creditsUsed: isAdmin ? 0 : 1 });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan saat generate gambar" }, { status: 500 });
  }
}
