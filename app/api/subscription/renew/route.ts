import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBillingProduct } from "@/lib/billing/products";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createInvoice, isMayarConfigured } from "@/lib/mayar";

export const runtime = "nodejs";

/**
 * POST /api/subscription/renew
 * Buat invoice Mayar untuk memperpanjang/topup plan aktif user (30 hari).
 * Mengembalikan paymentUrl + paymentId.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: userData } = await supabase
      .from("users")
      .select("plan, role, email")
      .eq("id", user.id)
      .single();

    if (userData?.role === "admin") {
      return NextResponse.json({ error: "Admin tidak memerlukan perpanjangan." }, { status: 400 });
    }

    // Bisa override planId dari body (mis. upgrade saat renew)
    const body = await req.json().catch(() => ({}));
    const planId: string = body.planId || userData?.plan || "starter";

    const product = getBillingProduct(planId);
    if (!product || product.type !== "plan") {
      return NextResponse.json({ error: "Paket tidak valid." }, { status: 400 });
    }

    if (!isMayarConfigured()) {
      return NextResponse.json({ error: "Pembayaran belum dikonfigurasi. Hubungi administrator." }, { status: 500 });
    }

    const email = user.email || userData?.email || "";
    const siteUrl = process.env.SITE_URL || req.nextUrl.origin;

    const { data: payRow, error: insErr } = await supabase
      .from("payments")
      .insert({ user_id: user.id, product_id: product.id, product_type: product.type, plan_id: product.planId, amount: product.amount, credits: product.credits, article_grants: product.articleGrants, duration_days: product.durationDays, word_quota: product.wordQuota, max_words_per_article: product.maxWordsPerArticle, status: "pending" })
      .select("id")
      .single();

    if (insErr || !payRow) {
      return NextResponse.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
    }

    const invoice = await createInvoice({
      name: email.split("@")[0] || "Pelanggan",
      email,
      amount: product.amount,
      description: `Artikel SEO ${product.name} (Perpanjang) — ${product.wordQuota.toLocaleString("id-ID")} kata (30 hari)`,
      redirectUrl: `${siteUrl}/account?verify_payment=${payRow.id}`,
    });

    await supabase.from("payments").update({
      mayar_invoice_id: invoice.id,
      mayar_transaction_id: invoice.transactionId,
      payment_url: invoice.link,
    }).eq("id", payRow.id);

    return NextResponse.json({ paymentId: payRow.id, paymentUrl: invoice.link, planId: product.planId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal membuat transaksi perpanjangan" }, { status: 500 });
  }
}
