import { createClient } from "@supabase/supabase-js";
import { getInvoiceStatus } from "./mayar";

export type SettleResult = "credited" | "already_paid" | "unpaid" | "expired" | "not_found";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verifikasi pembayaran langsung ke API Mayar lalu terapkan paket + kredit.
 * Aman dipanggil berkali-kali (redirect, polling, maupun webhook): guard
 * update(status: pending -> paid) memastikan kredit hanya ditambahkan sekali.
 *
 * Model langganan: tiap pembayaran sukses memperpanjang plan 30 hari dari
 * sekarang dan menambah kredit paket. Saat expired, plan-status menurunkan ke
 * free; user tinggal bayar lagi (top-up) untuk memperpanjang.
 *
 * @param expectedUserId jika diisi, settle hanya jika pembayaran milik user ini.
 */
export async function settlePayment(
  paymentId: string,
  expectedUserId?: string
): Promise<{ result: SettleResult; planId?: string; creditsAdded?: number; newCredits?: number }> {
  const sb = svc();

  const { data: pay } = await sb.from("payments").select("*").eq("id", paymentId).single();
  if (!pay) return { result: "not_found" };
  if (expectedUserId && pay.user_id !== expectedUserId) return { result: "not_found" };
  if (pay.status === "paid") return { result: "already_paid", planId: pay.plan_id };

  const { status, amount } = await getInvoiceStatus(pay.mayar_invoice_id);

  if (status === "closed") {
    await sb.from("payments").update({ status: "expired" }).eq("id", paymentId).eq("status", "pending");
    return { result: "expired" };
  }
  if (status !== "paid" || amount < pay.amount) return { result: "unpaid" };

  // Guard atomik: hanya satu pemanggil yang berhasil mengubah pending -> paid
  const { data: locked } = await sb
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id");

  if (!locked || locked.length === 0) return { result: "already_paid", planId: pay.plan_id };

  // Terapkan paket + tambah kredit + perpanjang 30 hari (lanjut dari expiry lama jika masih aktif)
  const { data: u } = await sb.from("users").select("credits, plan_expires_at").eq("id", pay.user_id).single();
  const newCredits = (u?.credits ?? 0) + pay.credits;
  const currentExpiry = u?.plan_expires_at ? new Date(u.plan_expires_at) : new Date();
  const base = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  await sb.from("users").update({
    plan: pay.plan_id,
    credits: newCredits,
    plan_expires_at: newExpiry.toISOString(),
    subscription_id: pay.mayar_invoice_id,
  }).eq("id", pay.user_id);

  return { result: "credited", planId: pay.plan_id, creditsAdded: pay.credits, newCredits };
}
