import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";
import { IMAGE_CREDIT_COST } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 30;

// Generate FOTO realistis via Cloudflare Workers AI (flux-1-schnell).
// Body: { prompt, keyword? } → Response: { image: base64JPEG, creditsUsed }
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const userId = user.id;

  const { prompt, keyword } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Deskripsi gambar diperlukan" }, { status: 400 });

  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!acct || !token) {
    return NextResponse.json({ error: "Cloudflare belum dikonfigurasi (CF_ACCOUNT_ID / CF_API_TOKEN). Pakai AI SVG dulu." }, { status: 500 });
  }

  // ── Potong kredit (sama dengan AI SVG). Admin bypass. ──
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: userData } = await sb.from("users").select("credits, role").eq("id", userId).single();
  const isAdmin = userData?.role === "admin";

  if (!isAdmin) {
    const { data: deductResult, error: rpcError } = await sb.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: IMAGE_CREDIT_COST,
    });
    if (rpcError) {
      if ((userData?.credits ?? 0) < IMAGE_CREDIT_COST) {
        return NextResponse.json({ error: `Kredit tidak cukup (butuh ${IMAGE_CREDIT_COST} 💎 untuk gambar AI)` }, { status: 402 });
      }
      await sb.from("users").update({ credits: (userData?.credits ?? 0) - IMAGE_CREDIT_COST }).eq("id", userId);
    } else {
      const result = deductResult as { success: boolean; credits: number };
      if (!result?.success) {
        return NextResponse.json({ error: `Kredit tidak cukup (butuh ${IMAGE_CREDIT_COST} 💎 untuk gambar AI)` }, { status: 402 });
      }
    }
  }

  const refund = async () => {
    if (isAdmin) return;
    try { await sb.rpc("refund_credit", { p_user_id: userId, p_amount: IMAGE_CREDIT_COST }); }
    catch { await sb.from("users").update({ credits: (userData?.credits ?? IMAGE_CREDIT_COST) }).eq("id", userId); }
  };

  const fullPrompt = keyword
    ? `High-quality photorealistic image for an article about "${keyword}". ${prompt}`
    : `High-quality photorealistic image. ${prompt}`;

  try {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ prompt: fullPrompt.slice(0, 2048), steps: 6 }),
      }
    );

    if (!r.ok) {
      const errText = await r.text().catch(() => "(no body)");
      console.error("[generate-photo] cloudflare error:", r.status, errText.slice(0, 200));
      await refund();
      return NextResponse.json({ error: `Cloudflare error (${r.status}). Cek token/Account ID.` }, { status: 502 });
    }

    const data = await r.json();
    const b64: string = data?.result?.image ?? "";
    if (!b64 || b64.length < 100) {
      await refund();
      return NextResponse.json({ error: "Cloudflare tidak mengembalikan gambar. Coba lagi." }, { status: 422 });
    }

    return NextResponse.json({ image: b64, creditsUsed: isAdmin ? 0 : IMAGE_CREDIT_COST });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-photo] error:", msg);
    await refund();
    return NextResponse.json({ error: `Gagal generate foto: ${msg}` }, { status: 500 });
  }
}
