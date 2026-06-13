import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";
import { settlePayment } from "@/lib/settle-payment";

export const runtime = "nodejs";

// Verifikasi pembayaran Mayar. Bisa dipanggil dengan paymentId (saat redirect),
// atau tanpa paymentId → ambil pembayaran pending terakhir milik user.
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    let paymentId: string | undefined = body.paymentId;

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!paymentId) {
      const { data: latest } = await sb
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) {
        return NextResponse.json({ success: false, error: "Tidak ada pembayaran pending untuk diverifikasi." });
      }
      paymentId = latest.id;
    }

    const r = await settlePayment(paymentId!, user.id);

    if (r.result === "credited") {
      return NextResponse.json({ success: true, planId: r.planId, creditsAdded: r.creditsAdded, newCredits: r.newCredits });
    }
    if (r.result === "already_paid") {
      return NextResponse.json({ success: true, alreadyApplied: true, planId: r.planId });
    }
    if (r.result === "not_found") {
      return NextResponse.json({ success: false, error: "Pembayaran tidak ditemukan." }, { status: 404 });
    }
    if (r.result === "expired") {
      return NextResponse.json({ success: false, status: "expired", error: "Invoice sudah kedaluwarsa. Silakan buat pembayaran baru." });
    }
    return NextResponse.json({ success: false, status: "unpaid", message: "Pembayaran belum lunas." });
  } catch {
    return NextResponse.json({ error: "Gagal memverifikasi pembayaran" }, { status: 500 });
  }
}
