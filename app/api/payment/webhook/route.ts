import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { PLANS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, status_code, gross_amount, signature_key,
            transaction_status, fraud_status, custom_field1, custom_field2 } = body;

    // Verifikasi signature Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const hash = crypto.createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (hash !== signature_key) {
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
    }

    const isSuccess =
      (transaction_status === "settlement" || transaction_status === "capture") &&
      (fraud_status === "accept" || fraud_status === undefined);

    if (!isSuccess) return NextResponse.json({ status: "ignored" });

    const userId = custom_field1;
    const planId = custom_field2;
    const plan   = PLANS.find(p => p.id === planId);
    if (!userId || !plan) return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Tambah kredit ke user
    const { data: user } = await supabase
      .from("users").select("credits").eq("id", userId).single();

    await supabase.from("users").update({
      plan: planId,
      credits: (user?.credits ?? 0) + plan.credits,
      plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", userId);

    return NextResponse.json({ success: true, creditsAdded: plan.credits });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
