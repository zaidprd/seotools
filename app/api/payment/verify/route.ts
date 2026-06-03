import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/constants";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });

    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const statusUrl = isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const r = await fetch(statusUrl, {
      headers: { "Authorization": `Basic ${Buffer.from(serverKey + ":").toString("base64")}` },
    });
    const tx = await r.json();

    if (!r.ok) throw new Error(tx?.error_messages?.join(", ") || `Midtrans status error ${r.status}`);

    // Verify the order belongs to the authenticated user
    if (tx.custom_field1 && tx.custom_field1 !== user.id) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const isSuccess =
      tx.transaction_status === "settlement" ||
      (tx.transaction_status === "capture" && (tx.fraud_status === "accept" || !tx.fraud_status));

    if (!isSuccess) {
      return NextResponse.json({
        success: false,
        status: tx.transaction_status,
        message: `Status transaksi: ${tx.transaction_status}`,
      });
    }

    const planId = tx.custom_field2;
    const plan = PLANS.find(p => p.id === planId);
    if (!planId || !plan) {
      return NextResponse.json({ error: "Data plan tidak ditemukan di transaksi" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData } = await supabase
      .from("users").select("credits, plan, plan_expires_at").eq("id", user.id).single();

    // Idempotency: skip jika plan sudah di-update dengan expiry di masa depan
    const alreadyApplied =
      userData?.plan === planId &&
      userData?.plan_expires_at &&
      new Date(userData.plan_expires_at) > new Date();

    if (alreadyApplied) {
      return NextResponse.json({ success: true, alreadyApplied: true, message: "Paket sudah aktif" });
    }

    const newCredits = (userData?.credits ?? 0) + plan.credits;
    await supabase.from("users").update({
      plan: planId,
      credits: newCredits,
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_id: orderId,
    }).eq("id", user.id);

    return NextResponse.json({
      success: true,
      planId,
      creditsAdded: plan.credits,
      newCredits,
      orderId,
    });

  } catch {
    return NextResponse.json({ error: "Gagal memverifikasi pembayaran" }, { status: 500 });
  }
}
