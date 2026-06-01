import { NextRequest, NextResponse } from "next/server";
import { PLANS } from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { planId, userId, email } = await req.json();
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.price === 0) return NextResponse.json({ error: "Plan tidak valid" }, { status: 400 });

    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const orderId = `st-${planId}-${Date.now()}`;

    const r = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: plan.price },
        customer_details: { email },
        item_details: [{ id: planId, price: plan.price, quantity: 1, name: `SEOTulis ${plan.name}` }],
        callbacks: {
          finish: `${process.env.SITE_URL || "http://localhost:3000"}/dashboard?payment=success`,
        },
        custom_field1: userId,
        custom_field2: planId,
      }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error_messages?.join(", ") || "Midtrans error");
    return NextResponse.json({ token: data.token, redirect_url: data.redirect_url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
