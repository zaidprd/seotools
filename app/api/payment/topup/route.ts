import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TOPUP_PACKS } from "@/lib/constants";
import { requireAuth } from "@/lib/supabase/require-auth";
import { createInvoice, isMayarConfigured } from "@/lib/mayar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { packId } = await req.json();
    const pack = TOPUP_PACKS.find(p => p.id === packId);
    if (!pack) return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });

    if (!isMayarConfigured()) {
      return NextResponse.json({ error: "Pembayaran belum dikonfigurasi. Hubungi administrator." }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const siteUrl = process.env.SITE_URL || req.nextUrl.origin;

    const { data: payRow, error: insErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        plan_id: pack.id,   // e.g. "topup_10" — settle-payment detects prefix "topup_"
        amount: pack.price,
        credits: pack.credits,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !payRow) {
      console.error("[payment/topup] insert error:", insErr?.message);
      return NextResponse.json({ error: "Gagal membuat pembayaran" }, { status: 500 });
    }

    const invoice = await createInvoice({
      name: user.email?.split("@")[0] || "Pelanggan",
      email: user.email || "",
      amount: pack.price,
      description: `Artikel SEO Topup ${pack.name} — ${pack.credits} kredit`,
      redirectUrl: `${siteUrl}/account?verify_payment=${payRow.id}`,
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
