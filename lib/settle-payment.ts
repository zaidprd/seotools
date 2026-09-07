import { createClient } from "@supabase/supabase-js";
import { getInvoiceStatus } from "./mayar";

export type SettleResult =
  | "credited"
  | "granted"
  | "already_paid"
  | "unpaid"
  | "expired"
  | "not_found";

export type Settlement = {
  result: SettleResult;
  productId?: string;
  planId?: string;
  creditsAdded?: number;
  articleGrantsAdded?: number;
  newCredits?: number;
  trialArticlesRemaining?: number;
};

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Verify with Mayar, then atomically apply the entitlement and mark the payment paid. */
export async function settlePayment(paymentId: string, expectedUserId?: string): Promise<Settlement> {
  const sb = svc();
  const { data: pay, error: paymentError } = await sb
    .from("payments")
    .select("id,user_id,status,amount,plan_id,product_id,mayar_invoice_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) throw paymentError;
  if (!pay || (expectedUserId && pay.user_id !== expectedUserId)) return { result: "not_found" };
  if (pay.status === "paid") {
    return { result: "already_paid", productId: pay.product_id, planId: pay.plan_id ?? undefined };
  }
  if (pay.status === "expired") return { result: "expired" };
  if (pay.status !== "pending" || !pay.mayar_invoice_id) return { result: "unpaid" };

  const invoice = await getInvoiceStatus(pay.mayar_invoice_id);
  if (invoice.status === "closed") {
    await sb.from("payments").update({ status: "expired" }).eq("id", paymentId).eq("status", "pending");
    return { result: "expired" };
  }

  // Exact equality is intentional: neither underpayment nor overpayment is accepted.
  if (invoice.status !== "paid" || invoice.amount !== pay.amount) return { result: "unpaid" };

  const { data, error } = await sb.rpc("settle_mayar_payment", {
    p_payment_id: paymentId,
    p_verified_amount: invoice.amount,
  });
  if (error) throw error;

  const result = data as Settlement | null;
  if (!result) throw new Error("Settlement RPC tidak mengembalikan hasil");
  if (result.result === "credited" || result.result === "granted" || result.result === "already_paid") {
    return result;
  }
  if (result.result === "not_found") return result;
  throw new Error(`Settlement ditolak: ${String((result as { result?: string }).result || "unknown")}`);
}
