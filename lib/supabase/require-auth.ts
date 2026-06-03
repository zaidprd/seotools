import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type AuthSuccess = { user: User; errorResponse: null };
type AuthFailure = { user: null; errorResponse: NextResponse };

/**
 * Verifies the caller's Supabase session from cookies.
 * Returns the authenticated User, or an errorResponse (401) if not authenticated.
 * Always use this instead of trusting a userId from the request body.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Autentikasi diperlukan" }, { status: 401 }),
    };
  }
  return { user, errorResponse: null };
}
