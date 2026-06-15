import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/constants";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createInvoice, isMayarConfigured } from "@/lib/mayar";

export const runtime = "nodejs";

// Buat invoice Mayar untuk membeli/topup paket. Mengembalikan paymentUrl
// (link pembayaran Mayar) + paymentId (untuk verifikasi saat redirect).
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { planId } = await req.json();
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.price === 0) return NextResponse.json({ error: "Plan tidak valid" }, { status: 400 });

    if (!isMayarConfigured()) {
      return NextResponse.json({ error: "Pembayaran belum dikonfigurasi. Hubungi administrator." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const siteUrl = process.env.SITE_URL || req.nextUrl.origin;

    // Buat row dulu agar punya paymentId untuk redirectUrl
    const { data: payRow, error: insErr } = await supabase
      .from("payments")
      .insert({ user_id: user.id, plan_id: planId, amount: plan.price, credits: plan.credits, status: "pending" })
      .select("id")
      .single();

    if (insErr || !payRow) {
      console.error("[payment/create] insert error:", insErr?.message);
      return NextResponse.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
    }

    const invoice = await createInvoice({
      name: user.email?.split("@")[0] || "Pelanggan",
      email: user.email || "",
      amount: plan.price,
      description: `Artikel SEO ${plan.name} — ${plan.credits} kredit (30 hari)`,
      redirectUrl: `${siteUrl}/dashboard?verify_payment=${payRow.id}`,
    });

    await supabase.from("payments").update({
      mayar_invoice_id: invoice.id,
      mayar_transaction_id: invoice.transactionId,
      payment_url: invoice.link,
    }).eq("id", payRow.id);

    return NextResponse.json({ paymentId: payRow.id, paymentUrl: invoice.link });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal membuat transaksi" }, { status: 500 });
  }
}
