import type { GenerationInput } from "./types";

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 30_000) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseGenerationInput(value: unknown): GenerationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Payload tidak valid");
  const body = value as Record<string, unknown>;
  const legacyPrompt = text(body.prompt);
  const keyword = text(body.keyword) || extractKeyword(legacyPrompt) || legacyPrompt.slice(0, 500);
  if (!keyword) throw new Error("Keyword atau prompt wajib diisi");

  return {
    keyword,
    title: text(body.title) || undefined,
    language: text(body.language, "Indonesia"),
    articleType: text(body.articleType, "Blog Post"),
    articleSize: text(body.articleSize, "Sedang (1.000–1.500 kata)"),
    tone: text(body.tone, "Profesional"),
    pov: text(body.pov, "Umum (Anda/Kita)"),
    readability: text(body.readability, "Menengah (SMA)"),
    country: text(body.country, "Indonesia"),
    brandVoice: text(body.brandVoice) || undefined,
    details: text(body.details) || undefined,
    seoKeywords: text(body.seoKeywords) || undefined,
    outline: text(body.outline) || undefined,
    withConclusion: bool(body.withConclusion, true),
    withTables: bool(body.withTables, false),
    withH3: bool(body.withH3, true),
    withLists: bool(body.withLists, true),
    withNotes: bool(body.withNotes, false),
    withKeyTakeaways: bool(body.withKeyTakeaways, false),
    withFAQ: bool(body.withFAQ, true),
    withBold: bool(body.withBold, true),
    withQuotes: bool(body.withQuotes, false),
    internalLinkBaseUrl: text(body.internalLinkBaseUrl) || undefined,
    internalLinkPages: text(body.internalLinkPages) || undefined,
    externalLinkType: text(body.extLinkType, "Tidak Ada"),
    externalLinkUrls: text(body.extLinkUrls) || undefined,
    legacyPrompt: legacyPrompt || undefined,
  };
}

function extractKeyword(prompt: string): string {
  const match = prompt.match(/keyword[^:]*:\s*["“]?([^"”\n]+)/i);
  return match?.[1]?.trim() || "";
}
