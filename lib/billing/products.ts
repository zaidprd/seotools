export type BillingProduct = {
  id: string;
  name: string;
  type: "one_time" | "plan";
  amount: number;
  credits: number;
  articleGrants: number;
  planId: string | null;
  durationDays: number | null;
  description: string;
  wordQuota: number;
  maxWordsPerArticle: number;
};

/**
 * Billing source of truth. Do not derive prices or grants from client/UI data.
 * Existing plan IDs are intentionally also valid product IDs for compatibility.
 */
export const BILLING_PRODUCTS = {
  trial_article: {
    id: "trial_article",
    name: "Trial Artikel",
    type: "one_time",
    amount: 5_000,
    credits: 0,
    articleGrants: 1,
    planId: null,
    durationDays: null,
    description: "1 artikel SEO hingga 2.000 kata",
    wordQuota: 2_000,
    maxWordsPerArticle: 2_000,
  },
  starter: {
    id: "starter",
    name: "Starter",
    type: "plan",
    amount: 25_000,
    credits: 35,
    articleGrants: 0,
    planId: "starter",
    durationDays: 30,
    description: "Artikel SEO Starter — 6.000 kata (30 hari)",
    wordQuota: 6_000,
    maxWordsPerArticle: 2_000,
  },
  pro: {
    id: "pro",
    name: "Pro",
    type: "plan",
    amount: 75_000,
    credits: 100,
    articleGrants: 0,
    planId: "pro",
    durationDays: 30,
    description: "Artikel SEO Pro — 25.000 kata (30 hari)",
    wordQuota: 25_000,
    maxWordsPerArticle: 2_000,
  },
  max: {
    id: "max",
    name: "Max",
    type: "plan",
    amount: 150_000,
    credits: 250,
    articleGrants: 0,
    planId: "max",
    durationDays: 30,
    description: "Artikel SEO Max — 60.000 kata (30 hari)",
    wordQuota: 60_000,
    maxWordsPerArticle: 2_500,
  },
} as const satisfies Record<string, BillingProduct>;

export type BillingProductId = keyof typeof BILLING_PRODUCTS;

export function getBillingProduct(id: unknown): BillingProduct | null {
  if (typeof id !== "string") return null;
  return (BILLING_PRODUCTS as Record<string, BillingProduct>)[id] ?? null;
}
