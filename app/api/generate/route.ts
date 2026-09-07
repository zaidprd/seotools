import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/require-auth";
import { parseGenerationInput } from "@/lib/generation/input";
import { runGenerationPipeline } from "@/lib/generation/pipeline";
import type { GenerationInput } from "@/lib/generation/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// The project does not provide generated Supabase database types, so route-level
// compatibility calls use the SDK's dynamic client shape.
type ServiceClient = any;
type BillingSource = "admin" | "trial_words" | "monthly_words" | "legacy_credits";

interface UserBilling {
  credits: number;
  plan: string | null;
  credits_used: number | null;
  articles_used: number | null;
  plan_expires_at: string | null;
  role: string | null;
  trial_articles_remaining: number | null;
  trial_words_remaining: number | null;
  monthly_word_quota: number | null;
  monthly_words_used: number | null;
  max_words_per_article: number | null;
  word_quota_period_ends_at: string | null;
}

interface Billing {
  cost: number;
  isAdmin: boolean;
  deducted: boolean;
  source: BillingSource;
  reservedWords: number;
  userBefore: UserBilling;
}

function configuredCost(): number {
  const cost = Number(process.env.AI_GENERATION_CREDITS);
  return Number.isInteger(cost) && cost > 0 && cost <= 100 ? cost : 7;
}

function requestedMaximumWords(input: GenerationInput): number {
  const values = [...input.articleSize.matchAll(/\d[\d.]*/g)]
    .map((match) => Number(match[0].replace(/\./g, "")))
    .filter(Number.isFinite);
  if (values.length >= 2) return Math.max(values[0], values[1]);
  if (values.length === 1) return values[0];
  return 1_500;
}

function rpcResult(value: unknown): { success?: boolean; credits?: number } {
  if (Array.isArray(value)) return (value[0] || {}) as { success?: boolean; credits?: number };
  return (value || {}) as { success?: boolean; credits?: number };
}

function quotaExceeded(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 402 });
}

async function chargeLegacyCredits(
  supabase: ServiceClient,
  userId: string,
  user: UserBilling,
  isAdmin: boolean,
): Promise<Billing | NextResponse> {
  const planActive = !user.plan_expires_at || new Date(user.plan_expires_at) > new Date();
  const freePlan = !isAdmin && (!planActive || !user.plan || user.plan === "free");
  const cost = isAdmin ? 0 : freePlan ? 1 : configuredCost();

  if (isAdmin) {
    return { cost, isAdmin, deducted: false, source: "admin", reservedWords: 0, userBefore: user };
  }

  // Legacy credits purchased with an expired subscription must never turn into
  // cheaper free-plan credits.
  if (!planActive && user.plan_expires_at && (user.credits ?? 0) > 0) {
    return NextResponse.json(
      { error: "Paket Anda sudah berakhir. Perpanjang paket untuk menggunakan kuota langganan kembali." },
      { status: 403 },
    );
  }

  const { data: deducted, error: rpcError } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
  });

  if (!rpcError) {
    const result = rpcResult(deducted);
    if (!result.success) {
      return quotaExceeded(`Kredit tidak cukup. Butuh ${cost} 💎, kamu punya ${result.credits ?? user.credits ?? 0} 💎.`);
    }
    return { cost, isAdmin, deducted: true, source: "legacy_credits", reservedWords: 0, userBefore: user };
  }

  console.warn(`[generate] deduct_credits RPC unavailable; using compatibility update: ${rpcError.message}`);
  if ((user.credits ?? 0) < cost) {
    return quotaExceeded(`Kredit tidak cukup. Butuh ${cost} 💎, kamu punya ${user.credits ?? 0} 💎.`);
  }

  const { error: updateError } = await supabase.from("users").update({
    credits: user.credits - cost,
    credits_used: (user.credits_used ?? 0) + cost,
    articles_used: (user.articles_used ?? 0) + 1,
  }).eq("id", userId).eq("credits", user.credits);
  if (updateError) throw new Error("Gagal memotong kredit");

  return { cost, isAdmin, deducted: true, source: "legacy_credits", reservedWords: 0, userBefore: user };
}

async function reserveBilling(
  supabase: ServiceClient,
  userId: string,
  requestedWords: number,
): Promise<Billing | NextResponse> {
  const { data, error } = await supabase
    .from("users")
    .select("credits, plan, credits_used, articles_used, plan_expires_at, role, trial_articles_remaining, trial_words_remaining, monthly_word_quota, monthly_words_used, max_words_per_article, word_quota_period_ends_at")
    .eq("id", userId)
    .single();

  if (error || !data) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  const user = data as UserBilling;
  const isAdmin = user.role === "admin";
  if (isAdmin) {
    return { cost: 0, isAdmin, deducted: false, source: "admin", reservedWords: 0, userBefore: user };
  }

  // A trial is always preferred when it can satisfy the selected article size.
  if (requestedWords <= 2_000 && (user.trial_articles_remaining ?? 0) > 0) {
    const { data: consumed, error: trialError } = await supabase.rpc("consume_trial_word_quota", {
      p_user_id: userId,
      p_words: requestedWords,
    });
    if (trialError) throw new Error(`Kuota kata trial gagal digunakan: ${trialError.message}`);
    if (rpcResult(consumed).success) {
      return { cost: 0, isAdmin, deducted: true, source: "trial_words", reservedWords: requestedWords, userBefore: user };
    }
  }

  // Null means this account predates word quotas. A zero is still a configured
  // quota and must not fall through to legacy credits.
  if (user.monthly_word_quota !== null) {
    const maxWords = user.max_words_per_article ?? 0;
    if (requestedWords > maxWords) {
      return NextResponse.json(
        { error: `Ukuran artikel melebihi batas paket Anda (${maxWords.toLocaleString("id-ID")} kata per artikel).` },
        { status: 400 },
      );
    }

    const quotaActive = !!user.word_quota_period_ends_at && new Date(user.word_quota_period_ends_at) > new Date();
    if (!quotaActive) {
      return NextResponse.json(
        { error: "Paket kata bulanan Anda sudah berakhir. Perpanjang paket untuk melanjutkan." },
        { status: 403 },
      );
    }

    const { data: consumed, error: quotaError } = await supabase.rpc("consume_monthly_word_quota", {
      p_user_id: userId,
      p_words: requestedWords,
    });
    if (quotaError) throw new Error(`Kuota kata bulanan gagal digunakan: ${quotaError.message}`);
    if (!rpcResult(consumed).success) {
      return quotaExceeded(`Kuota kata bulanan tidak cukup untuk reservasi ${requestedWords.toLocaleString("id-ID")} kata.`);
    }
    return { cost: 0, isAdmin, deducted: true, source: "monthly_words", reservedWords: requestedWords, userBefore: user };
  }

  return chargeLegacyCredits(supabase, userId, user, isAdmin);
}

async function refundBilling(supabase: ServiceClient, userId: string, billing: Billing): Promise<void> {
  if (billing.isAdmin || !billing.deducted) return;

  if (billing.source === "trial_words") {
    const { error } = await supabase.rpc("refund_trial_word_quota", {
      p_user_id: userId,
      p_words: billing.reservedWords,
    });
    if (error) throw new Error(`Refund kuota kata trial gagal: ${error.message}`);
    return;
  }

  if (billing.source === "monthly_words") {
    const { error } = await supabase.rpc("refund_monthly_word_quota", {
      p_user_id: userId,
      p_words: billing.reservedWords,
    });
    if (error) throw new Error(`Refund kuota kata bulanan gagal: ${error.message}`);
    return;
  }

  if (billing.source !== "legacy_credits" || billing.cost === 0) return;

  const { error: rpcError } = await supabase.rpc("refund_credit", {
    p_user_id: userId,
    p_amount: billing.cost,
  });
  if (!rpcError) return;

  console.warn(`[generate] refund_credit RPC unavailable; using compatibility refund: ${rpcError.message}`);
  const { data } = await supabase
    .from("users")
    .select("credits, credits_used, articles_used")
    .eq("id", userId)
    .single();
  if (!data) throw new Error("Data user tidak tersedia untuk refund");
  const { error } = await supabase.from("users").update({
    credits: (data.credits ?? 0) + billing.cost,
    credits_used: Math.max(0, (data.credits_used ?? 0) - billing.cost),
    articles_used: Math.max(0, (data.articles_used ?? 0) - 1),
  }).eq("id", userId).eq("credits", data.credits);
  if (error) throw new Error("Refund kredit gagal");
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  let input: GenerationInput;
  try {
    input = parseGenerationInput(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payload tidak valid" },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[generate] Supabase server credentials are not configured");
    return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey);
  const requestedWords = requestedMaximumWords(input);
  let billing: Billing | undefined;
  try {
    const charge = await reserveBilling(supabase, user.id, requestedWords);
    if (charge instanceof NextResponse) return charge;
    billing = charge;

    const article = await runGenerationPipeline(input, billing.cost);
    const { data: savedArticle, error: saveError } = await supabase.from("articles").insert({
      user_id: user.id,
      title: article.title,
      keyword: input.keyword,
      model_id: process.env.AI_PRIMARY_MODEL || "claude-sonnet-4-6",
      content: article.contentMarkdown,
      word_count: article.wordCount,
      credits_used: article.creditsUsed,
    }).select("id").single();
    if (saveError) throw new Error(`Penyimpanan artikel gagal: ${saveError.message}`);

    return NextResponse.json({
      article: { ...article, id: savedArticle?.id },
      text: article.contentMarkdown,
      creditsUsed: article.creditsUsed,
    });
  } catch (error) {
    console.error("[generate] Generation failed:", error instanceof Error ? error.message : error);
    if (billing?.deducted) {
      try {
        await refundBilling(supabase, user.id, billing);
      } catch (refundError) {
        console.error("[generate] Billing refund failed:", refundError instanceof Error ? refundError.message : refundError);
      }
    }
    return NextResponse.json({ error: "Artikel gagal dibuat karena layanan AI bermasalah. Hak penggunaan otomatis dikembalikan." }, { status: 502 });
  }
}
