import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId diperlukan" }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("users")
      .select("id, email, plan, credits, credits_used, articles_used")
      .eq("id", userId)
      .single();

    if (error || !data) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
