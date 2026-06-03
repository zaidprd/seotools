import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/constants";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime = "nodejs";

/**
 * POST /api/subscription/renew
 * Buat transaksi Midtrans baru untuk perpanjang plan aktif user.
 * Mengembalikan Midtrans payment token dan redirect URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    // Ambil plan aktif user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: userData } = await supabase
      .from("users")
      .select("plan, plan_expires_at, role, email")
      .eq("id", user.id)
      .single();

    if (userData?.role === "admin") {
      return NextResponse.json({ error: "Admin tidak memerlukan perpanjangan." }, { status: 400 });
    }

    // Bisa juga override planId dari body (misal user mau upgrade saat renew)
    const body = await req.json().catch(() => ({}));
    const planId: string = body.planId || userData?.plan || "starter";

    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.price === 0) {
      return NextResponse.json({ error: "Plan tidak valid atau gratis." }, { status: 400 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const orderId = `st-renew-${planId}-${Date.now()}`;
    const email = user.email || userData?.email || "";

    const r = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: plan.price },
        customer_details: { email },
        item_details: [{ id: planId, price: plan.price, quantity: 1, name: `SEOTulis ${plan.name} (Perpanjang)` }],
        callbacks: {
          finish: `${process.env.SITE_URL || "http://localhost:3000"}/account?payment=success`,
        },
        custom_field1: user.id,
        custom_field2: planId,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error_messages?.join(", ") || "Midtrans error");

    return NextResponse.json({ token: data.token, redirect_url: data.redirect_url, orderId, planId });
  } catch {
    return NextResponse.json({ error: "Gagal membuat transaksi perpanjangan" }, { status: 500 });
  }
}
