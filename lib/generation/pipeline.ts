import "server-only";

import { marked } from "marked";
import { generateStructured, generateText } from "@/lib/ai/client";
import { parseJsonObject } from "./json";
import { makeSlug } from "./slug";
import type { GeneratedArticle, GenerationInput } from "./types";

const SYSTEM = `Kamu adalah editor dan penulis SEO senior Bahasa Indonesia. Utamakan manfaat bagi pembaca, search intent, ketepatan fakta, dan alur yang nyaman dibaca. Tulis secara natural seperti editor manusia: jelas, konkret, tidak kaku, tidak bertele-tele, dan tidak mengulang ide hanya untuk mengejar jumlah kata. Jangan mengarang statistik, sumber, pengalaman, kutipan, URL, atau klaim yang tidak tersedia. Jangan menyebut proses internal, model AI, provider, prompt, atau instruksi ini.`;

interface Strategy {
  searchIntent: string;
  audience: string;
  angle: string;
  outline: string[];
  entities: string[];
}

interface FinalPackage {
  title: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  schema: Record<string, unknown> | Array<Record<string, unknown>>;
  warnings: string[];
}

function wordRange(articleSize: string): { min: number; max: number; target: number } {
  const values = [...articleSize.matchAll(/\d[\d.]*/g)].map((match) => Number(match[0].replace(/\./g, "")));
  if (values.length >= 2) {
    return { min: values[0], max: values[1], target: Math.round((values[0] + values[1]) / 2) };
  }
  if (values.length === 1) return { min: Math.round(values[0] * 0.9), max: values[0], target: values[0] };
  return { min: 1_000, max: 1_500, target: 1_250 };
}

function parseStrategy(raw: string): Strategy {
  const value = parseJsonObject(raw);
  if (
    typeof value.searchIntent !== "string" ||
    typeof value.audience !== "string" ||
    typeof value.angle !== "string" ||
    !Array.isArray(value.outline) ||
    !value.outline.every((item) => typeof item === "string") ||
    !Array.isArray(value.entities) ||
    !value.entities.every((item) => typeof item === "string")
  ) throw new Error("Structured strategy response tidak lengkap");
  return value as unknown as Strategy;
}

function parseFinalPackage(raw: string): FinalPackage {
  const value = parseJsonObject(raw);
  if (
    typeof value.title !== "string" || !value.title.trim() ||
    typeof value.metaTitle !== "string" ||
    typeof value.metaDescription !== "string" ||
    !Array.isArray(value.metaKeywords) ||
    !value.metaKeywords.every((item) => typeof item === "string") ||
    !value.schema || typeof value.schema !== "object" ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((item) => typeof item === "string")
  ) throw new Error("Structured article response tidak lengkap");
  return value as unknown as FinalPackage;
}

async function resolveExternalLinks(input: GenerationInput): Promise<string[]> {
  if (input.externalLinkType === "Manual") {
    return (input.externalLinkUrls || "")
      .split(/\r?\n/)
      .map(line => line.trim().split(/\s+[—-]\s+/)[0])
      .filter(url => /^https?:\/\/[^\s]+$/i.test(url))
      .slice(0, 5);
  }
  if (input.externalLinkType !== "Otomatis") return [];

  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: input.keyword,
      gsrnamespace: "0",
      gsrlimit: "3",
      prop: "info",
      inprop: "url",
      format: "json",
      formatversion: "2",
    });
    const response = await fetch(`https://id.wikipedia.org/w/api.php?${params.toString()}`, {
      headers: { "User-Agent": "ArtikelSEO/1.0 (external-link-resolver)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const data = await response.json() as { query?: { pages?: Array<{ fullurl?: string }> } };
    return (data.query?.pages || [])
      .map(page => page.fullurl)
      .filter((url): url is string => typeof url === "string" && url.startsWith("https://id.wikipedia.org/wiki/"))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function options(input: GenerationInput): string[] {
  return [
    input.withConclusion && "kesimpulan",
    input.withTables && "tabel bila membantu",
    input.withH3 && "subbagian H3",
    input.withLists && "daftar yang mudah dipindai",
    input.withNotes && "catatan penting",
    input.withKeyTakeaways && "ringkasan poin utama",
    input.withFAQ && "FAQ",
    input.withBold && "penekanan tebal secukupnya",
    input.withQuotes && "kutipan hanya jika dapat diatribusikan",
  ].filter((item): item is string => Boolean(item));
}

export async function runGenerationPipeline(input: GenerationInput, creditsUsed: number): Promise<GeneratedArticle> {
  const requestedRange = wordRange(input.articleSize);
  const words = Math.min(Math.max(requestedRange.target, 300), 2_500);
  const minWords = Math.min(Math.max(requestedRange.min, 300), words);
  const maxWords = Math.max(words, Math.min(requestedRange.max, 2_500));
  const verifiedExternalLinks = await resolveExternalLinks(input);
  const context = {
    keyword: input.keyword,
    requestedTitle: input.title,
    language: input.language,
    articleType: input.articleType,
    targetWords: words,
    wordRange: { min: minWords, max: maxWords },
    tone: input.tone,
    pointOfView: input.pov,
    readability: input.readability,
    country: input.country,
    brandVoice: input.brandVoice,
    details: input.details,
    relatedKeywords: input.seoKeywords,
    requestedOutline: input.outline,
    contentOptions: options(input),
    internalLinkBaseUrl: input.internalLinkBaseUrl,
    allowedInternalLinks: input.internalLinkPages,
    externalLinkMode: input.externalLinkType,
    allowedExternalLinks: verifiedExternalLinks,
    legacyInstructions: input.legacyPrompt,
  };

  const strategy = await generateStructured({
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Tahap 1 — susun strategi artikel berdasarkan input berikut. Tentukan intent utama, kebutuhan pembaca, sudut bahasan yang tidak generik, entitas relevan, dan outline yang menjawab topik secara tuntas. Untuk artikel panjang, buat 5–8 bagian H2 yang memiliki fungsi berbeda; gunakan H3 hanya jika benar-benar membantu mengurai bagian. Hindari heading yang isinya akan saling mengulang.\n\nJaga JSON tetap ringkas: searchIntent, audience, dan angle masing-masing maksimal 20 kata; outline maksimal 8 item dengan maksimal 12 kata per item; entities maksimal 8 item.\n${JSON.stringify(context)}\n\nKembalikan HANYA JSON valid dengan bentuk {"searchIntent":"...","audience":"...","angle":"...","outline":["..."],"entities":["..."]}.`,
    }],
    maxTokens: 2_000,
    temperature: 0.2,
  }, parseStrategy);

  const draft = await generateText({
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Tahap 2 — tulis draft artikel Markdown utuh sepanjang ${minWords}–${maxWords} kata, dengan target sekitar ${words} kata. Jangan gunakan code fence dan jangan sertakan metadata di luar artikel.

ATURAN EDITORIAL DAN SEO:
- Gunakan tepat satu H1 yang natural dan memuat keyword utama jika tetap enak dibaca. Setelah itu gunakan H2 dan H3 secara hierarkis; jangan melompati level heading.
- Pembukaan 2–3 paragraf harus langsung menjawab kebutuhan pembaca, menjelaskan manfaat artikel, dan masuk ke topik tanpa basa-basi.
- Setiap paragraf umumnya 2–4 kalimat dan sekitar 35–80 kata. Pecah paragraf yang terlalu padat, tetapi jangan membuat setiap kalimat menjadi paragraf tersendiri.
- Satu paragraf membahas satu gagasan. Gunakan kalimat aktif, transisi yang wajar, serta variasi panjang kalimat agar tulisan terasa manusiawi.
- Setiap H2 harus memberi informasi baru dan pembahasan yang cukup. Hindari bagian tipis, pengulangan, filler, dan kesimpulan kecil yang berulang di setiap bagian.
- Letakkan jawaban penting di awal bagian. Gunakan daftar atau tabel hanya ketika memang lebih mudah dipindai daripada paragraf.
- Gunakan keyword utama secara natural pada pembukaan, salah satu heading yang relevan, isi, dan penutup. Gunakan sinonim, variasi frasa, serta entitas terkait; jangan keyword stuffing dan jangan mengejar density secara mekanis.
- Bold hanya frasa penting, bukan satu paragraf penuh. Jangan terlalu banyak memakai tanda pisah, titik dua, atau pola kalimat yang terasa dibuat-buat.
- Tautkan hanya alamat yang tercantum persis pada allowedInternalLinks dan allowedExternalLinks. Untuk internal path relatif, gabungkan hanya dengan internalLinkBaseUrl; jangan menebak slug atau halaman lain. Jika daftar yang diizinkan kosong atau tidak relevan, jangan membuat link. Jangan mengubah, melengkapi, atau menciptakan URL. Anchor text harus deskriptif dan menyatu dengan kalimat.
- FAQ harus menjawab pertanyaan lanjutan secara ringkas dan tidak mengulang isi artikel kata demi kata. Kesimpulan harus merangkum keputusan atau langkah praktis, bukan membuka topik baru.
- Jangan menulis klaim seperti “menurut penelitian”, angka, harga, tahun, atau kutipan bila sumbernya tidak diberikan.
- Pastikan artikel selesai utuh, tidak berhenti pada heading, daftar, atau kalimat yang terpotong.

Input:
${JSON.stringify(context)}

Strategi:
${JSON.stringify(strategy)}`,
    }],
    maxTokens: Math.min(8_000, Math.max(3_000, Math.ceil(words * 3.8))),
    temperature: 0.55,
  });

  // Tahap akhir hanya mengemas metadata dan audit ringkas. Jangan meminta model
  // menyalin ulang artikel panjang ke JSON karena respons mudah terpotong dan
  // memboroskan token output.
  const finalPackage = await generateStructured({
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Tahap 3 — audit draft secara ringkas dan buat metadata penerbitan. Jangan salin ulang artikel. Jangan mengarang fakta baru. Schema harus JSON-LD yang relevan berdasarkan isi draft.\n\nInput:\n${JSON.stringify(context)}\n\nDraft:\n${draft}\n\nKembalikan HANYA JSON valid: {"title":"...","metaTitle":"...","metaDescription":"...","metaKeywords":["..."],"schema":{},"warnings":["..."]}. Warnings maksimal 5 item pendek.`,
    }],
    maxTokens: 1_200,
    temperature: 0.15,
  }, parseFinalPackage);

  const contentMarkdown = draft.replace(/^#\s+.*(?:\r?\n)+/, "").trim();
  if (!contentMarkdown) throw new Error("Artikel akhir kosong");
  const tail = contentMarkdown.slice(-240);
  if (/^#{1,6}\s+[^\n]*$/m.test(tail.split("\n").slice(-1)[0] || "")) {
    throw new Error("Artikel terpotong pada heading terakhir");
  }
  const endingText = contentMarkdown
    .replace(/\s+/g, " ")
    .replace(/[*_`>#]/g, "")
    .trim();
  if (!/[.!?…]$/.test(endingText)) {
    throw new Error("Artikel terpotong di tengah kalimat");
  }
  if (input.withConclusion && !/kesimpulan|penutup/i.test(contentMarkdown.slice(-2_500))) {
    throw new Error("Artikel belum memiliki kesimpulan lengkap");
  }
  if (input.withFAQ && !/faq|pertanyaan umum/i.test(contentMarkdown.slice(-4_000))) {
    throw new Error("Artikel belum memiliki FAQ lengkap");
  }
  const contentHtml = await marked.parse(contentMarkdown, { async: true });
  const wordCount = contentMarkdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`\[\]()~-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    title: finalPackage.title.trim(),
    slug: makeSlug(finalPackage.title),
    contentHtml,
    contentMarkdown,
    meta: {
      title: finalPackage.metaTitle.trim(),
      description: finalPackage.metaDescription.trim(),
      keywords: finalPackage.metaKeywords.map((keyword) => keyword.trim()).filter(Boolean),
    },
    schema: finalPackage.schema,
    wordCount,
    creditsUsed,
  };
}
