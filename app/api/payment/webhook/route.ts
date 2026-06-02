import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { PLANS } from "@/lib/constants";

export const runtime = "nodejs";

// GET: health check untuk Midtrans
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "midtrans-webhook" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_id, status_code, gross_amount, signature_key,
      transaction_status, fraud_status, custom_field1, custom_field2,
      payment_type,
    } = body;

    // Verifikasi signature Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const expected = crypto.createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (expected !== signature_key) {
      console.error("[webhook] signature mismatch", { order_id, status_code, gross_amount });
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
    }

    // Payment types yang dianggap sukses
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && (fraud_status === "accept" || !fraud_status));

    if (!isSuccess) {
      console.log("[webhook] ignored status:", transaction_status);
      return NextResponse.json({ status: "ignored", transaction_status });
    }

    const userId = custom_field1;
    const planId = custom_field2;
    const plan   = PLANS.find(p => p.id === planId);

    if (!userId || !planId || !plan) {
      console.error("[webhook] missing data", { userId, planId, plan: !!plan });
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ambil kredit user saat ini (bisa ada sisa)
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("credits, plan")
      .eq("id", userId)
      .single();

    if (fetchErr) {
      console.error("[webhook] fetch user error:", fetchErr.message);
    }

    // Tambahkan kredit paket baru (tidak reset — user mungkin punya sisa kredit)
    const currentCredits = user?.credits ?? 0;
    const newCredits = currentCredits + plan.credits;

    const { error: updateErr } = await supabase.from("users").update({
      plan: planId,
      credits: newCredits,
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", userId);

    if (updateErr) {
      console.error("[webhook] update user error:", updateErr.message);
      return NextResponse.json({ error: "Gagal update user: " + updateErr.message }, { status: 500 });
    }

    console.log("[webhook] success", { userId, planId, creditsAdded: plan.credits, newCredits });
    return NextResponse.json({
      success: true,
      userId,
      planId,
      creditsAdded: plan.credits,
      newCredits,
      orderId: order_id,
    });

  } catch (e: any) {
    console.error("[webhook] exception:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
