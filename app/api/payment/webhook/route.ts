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
    } = body;

    // Verifikasi signature Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const expected = crypto.createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (expected !== signature_key) {
      console.error("[webhook] signature mismatch", { order_id });
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

    // Idempotency: cek apakah order_id sudah pernah diproses
    // Membutuhkan tabel processed_orders — jalankan supabase/migrations/20260604_security_fixes.sql
    const { error: insertError } = await supabase
      .from("processed_orders")
      .insert({ order_id, user_id: userId, plan_id: planId });

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate key — webhook ini sudah diproses sebelumnya (Midtrans retry)
        console.log("[webhook] duplicate order_id, skipping:", order_id);
        return NextResponse.json({ status: "ok", message: "Already processed" });
      }
      // Tabel belum ada (migration belum dijalankan) — log warning tapi lanjutkan
      console.warn("[webhook] processed_orders insert failed (migration belum dijalankan?):", insertError.message);
    }

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
      subscription_id: order_id,
    }).eq("id", userId);

    if (updateErr) {
      console.error("[webhook] update user error:", updateErr.message);
      return NextResponse.json({ error: "Gagal memproses pembayaran" }, { status: 500 });
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

  } catch {
    console.error("[webhook] exception");
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
