import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { settlePayment } from "@/lib/settle-payment";

export const runtime = "nodejs";

// GET: health check untuk Mayar
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "mayar-webhook" });
}

/**
 * Webhook Mayar (event payment.received).
 * Payload tidak dipercaya begitu saja — settlePayment memverifikasi ulang
 * status invoice langsung ke API Mayar sebelum menambahkan kredit.
 * Invoice yang tidak dikenal (mis. dari aplikasi lain di akun Mayar yang sama)
 * diabaikan dengan aman.
 */
export async function POST(req: NextRequest) {
  let body: { event?: string; data?: { id?: string; transactionId?: string }; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  // Verifikasi token webhook (defense-in-depth). Tolak hanya jika token diberikan
  // tapi salah; kalau tak ada tetap diproses karena settlePayment verifikasi ulang.
  const webhookToken = process.env.MAYAR_WEBHOOK_TOKEN;
  if (webhookToken) {
    const provided =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      req.headers.get("x-callback-token")?.trim() ||
      req.headers.get("x-mayar-token")?.trim() ||
      body.token?.trim() ||
      "";
    if (provided && provided !== webhookToken) {
      return NextResponse.json({ error: "Token webhook tidak valid" }, { status: 401 });
    }
  }

  if (body.event !== "payment.received" || !body.data) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { id, transactionId } = body.data;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ors: string[] = [];
  if (id) ors.push(`mayar_invoice_id.eq.${id}`, `mayar_transaction_id.eq.${id}`);
  if (transactionId) ors.push(`mayar_invoice_id.eq.${transactionId}`, `mayar_transaction_id.eq.${transactionId}`);
  if (!ors.length) return NextResponse.json({ ok: true, skipped: true });

  const { data: payment } = await sb
    .from("payments")
    .select("id")
    .or(ors.join(","))
    .limit(1)
    .maybeSingle();

  if (!payment) return NextResponse.json({ ok: true, skipped: true });

  try {
    const result = await settlePayment(payment.id);
    return NextResponse.json({ ok: true, result: result.result });
  } catch {
    // 500 agar Mayar melakukan retry
    return NextResponse.json({ error: "Verifikasi gagal" }, { status: 500 });
  }
}
