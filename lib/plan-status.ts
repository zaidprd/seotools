import { createClient } from "@supabase/supabase-js";

export interface PlanStatus {
  isAdmin: boolean;
  plan: string;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  expiresAt: Date | null;
}

/**
 * Cek status plan user secara server-side.
 * Jika expired, otomatis downgrade plan ke 'free' di DB.
 * Admin selalu aktif tanpa cek expiry.
 */
export async function checkPlanStatus(userId: string): Promise<PlanStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("users")
    .select("plan, plan_expires_at, role")
    .eq("id", userId)
    .single();

  const isAdmin = data?.role === "admin";

  if (isAdmin) {
    return { isAdmin: true, plan: data?.plan ?? "pro", isExpired: false, daysUntilExpiry: null, expiresAt: null };
  }

  const plan = data?.plan ?? "free";
  const expiresAt = data?.plan_expires_at ? new Date(data.plan_expires_at) : null;
  const now = new Date();

  const isPaidPlan = plan !== "free";
  const isExpired = isPaidPlan && expiresAt !== null && expiresAt <= now;

  // Downgrade ke free jika sudah expired
  if (isExpired) {
    await supabase.from("users").update({ plan: "free" }).eq("id", userId);
    return { isAdmin: false, plan: "free", isExpired: true, daysUntilExpiry: 0, expiresAt };
  }

  const daysUntilExpiry = expiresAt && isPaidPlan
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return { isAdmin: false, plan, isExpired: false, daysUntilExpiry, expiresAt };
}
