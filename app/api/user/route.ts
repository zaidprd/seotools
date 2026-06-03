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

    const { data, error } = await supabaseAdmin()
      .from("users")
      .select("id, email, plan, credits, credits_used, articles_used, plan_expires_at, role, subscription_id, auto_renew")
      .eq("id", user.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
