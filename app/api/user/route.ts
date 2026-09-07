import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    // Only allow fetching own data
    const requestedId = req.nextUrl.searchParams.get("userId");
    if (requestedId && requestedId !== user.id) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const fields = "id, email, plan, credits, credits_used, articles_used, monthly_word_quota, monthly_words_used, max_words_per_article, word_quota_period_ends_at, trial_articles_remaining, trial_words_remaining, plan_expires_at, role, subscription_id, auto_renew";
    const admin = supabaseAdmin();
    let { data, error } = await admin
      .from("users")
      .select(fields)
      .eq("id", user.id)
      .maybeSingle();

    // OAuth/email signup can finish before an application profile exists. Create a
    // minimal free profile once so new users reach the dashboard safely.
    if (!data && !error) {
      const created = await admin
        .from("users")
        .upsert({ id: user.id, email: user.email || "", plan: "free", credits: 0 }, { onConflict: "id" })
        .select(fields)
        .single();
      data = created.data;
      error = created.error;
    }

    if (error || !data) return NextResponse.json({ error: "Profil akun tidak dapat dibuat" }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
