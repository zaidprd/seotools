import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBillingProduct } from "@/lib/billing/products";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createInvoice, isMayarConfigured } from "@/lib/mayar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    // planId remains accepted for older clients. Product data always comes from this server.
    const product = getBillingProduct(body.productId ?? body.planId);
    if (!product || product.amount <= 0) {
      return NextResponse.json({ error: "Produk tidak valid" }, { status: 400 });
    }

    if (!isMayarConfigured()) {
      return NextResponse.json({ error: "Pembayaran belum dikonfigurasi. Hubungi administrator." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (product.id === "trial_article") {
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .in("status", ["pending", "paid"])
        .limit(1)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Produk trial hanya dapat dibeli satu kali" }, { status: 409 });
      }
    }

    const { data: payRow, error: insErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        product_id: product.id,
        product_type: product.type,
        plan_id: product.planId,
        amount: product.amount,
        credits: product.credits,
        article_grants: product.articleGrants,
        duration_days: product.durationDays,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !payRow) {
      const duplicateTrial = product.id === "trial_article" && insErr?.code === "23505";
      console.error("[payment/create] insert error:", insErr?.message);
      return NextResponse.json(
        { error: duplicateTrial ? "Produk trial hanya dapat dibeli satu kali" : "Gagal membuat pembayaran" },
        { status: duplicateTrial ? 409 : 500 }
      );
    }

    const siteUrl = process.env.SITE_URL || req.nextUrl.origin;
    let invoice;
    try {
      invoice = await createInvoice({
        name: user.email?.split("@")[0] || "Pelanggan",
        email: user.email || "",
        amount: product.amount,
        description: product.description,
        redirectUrl: `${siteUrl}/dashboard?verify_payment=${payRow.id}`,
      });
    } catch (error) {
      await supabase
        .from("payments")
        .update({ status: "create_failed" })
        .eq("id", payRow.id)
        .eq("status", "pending");
      throw error;
    }

    const { error: updateError } = await supabase.from("payments").update({
      mayar_invoice_id: invoice.id,
      mayar_transaction_id: invoice.transactionId,
      payment_url: invoice.link,
    }).eq("id", payRow.id);

    if (updateError) {
      console.error("[payment/create] invoice persistence error:", updateError.message);
      return NextResponse.json({ error: "Invoice dibuat tetapi gagal disimpan. Hubungi administrator." }, { status: 500 });
    }

    return NextResponse.json({ productId: product.id, paymentId: payRow.id, paymentUrl: invoice.link });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat transaksi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
