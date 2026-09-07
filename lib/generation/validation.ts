import type { GenerationInput } from "./types";

interface AllowedLinks {
  internal: Set<string>;
  external: Set<string>;
}

interface MarkdownLink {
  start: number;
  end: number;
  text: string;
  destination: string;
}

const URL_PROTOCOL = /^https?:$/i;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const QUESTION = /\?\s*$/;

function normalizeUrl(value: string, base?: URL): string | null {
  try {
    const url = new URL(value.trim(), base);
    if (!URL_PROTOCOL.test(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function linkValues(value?: string): string[] {
  return (value || "")
    .split(/\r?\n|,/)
    .map((line) => line.trim().split(/\s+[—-]\s+/)[0].trim())
    .filter(Boolean);
}

export function normalizeInternalBaseUrl(value?: string): URL | undefined {
  const normalized = value && normalizeUrl(value);
  return normalized ? new URL(normalized) : undefined;
}

export function normalizeAllowedInternalLinks(input: GenerationInput): string[] {
  const base = normalizeInternalBaseUrl(input.internalLinkBaseUrl);
  if (!base) return [];

  return [...new Set(linkValues(input.internalLinkPages)
    .map((value) => normalizeUrl(value, base))
    .filter((value): value is string => Boolean(value)))];
}

export function normalizeAllowedExternalLinks(urls: string[]): string[] {
  return [...new Set(urls
    .map((url) => normalizeUrl(url))
    .filter((url): url is string => Boolean(url)))];
}

function parseMarkdownLinks(markdown: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const pattern = /(?<!!)(?<!\\)\[([^\]\n]+)]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const destination = (match[2].startsWith("<") ? match[2].slice(1, -1) : match[2]).trim();
    links.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      destination,
    });
  }
  return links;
}

function allowedLinks(internalLinks: string[], externalLinks: string[]): AllowedLinks {
  return { internal: new Set(internalLinks), external: new Set(externalLinks) };
}

function isAllowedLink(destination: string, base: URL | undefined, allowed: AllowedLinks): boolean {
  const normalized = normalizeUrl(destination, base);
  return Boolean(normalized && (allowed.internal.has(normalized) || allowed.external.has(normalized)));
}

export function removeUnapprovedMarkdownLinks(
  markdown: string,
  internalBaseUrl: URL | undefined,
  internalLinks: string[],
  externalLinks: string[],
): string {
  const allowed = allowedLinks(internalLinks, externalLinks);
  const links = parseMarkdownLinks(markdown);
  let sanitized = "";
  let cursor = 0;

  for (const link of links) {
    sanitized += markdown.slice(cursor, link.start);
    sanitized += isAllowedLink(link.destination, internalBaseUrl, allowed) ? markdown.slice(link.start, link.end) : link.text;
    cursor = link.end;
  }
  sanitized += markdown.slice(cursor);

  const references = new Map<string, string>();
  for (const match of sanitized.matchAll(/^ {0,3}\[([^\]\n]+)\]:\s*(?:<([^>\n]+)>|(\S+)).*$/gm)) {
    references.set(match[1].trim().replace(/\s+/g, " ").toLowerCase(), match[2] || match[3]);
  }
  sanitized = sanitized.replace(/(?<!!)(?<!\\)\[([^\]\n]+)\]\[([^\]\n]*)\]/g, (match, text: string, reference: string) => {
    const key = (reference || text).trim().replace(/\s+/g, " ").toLowerCase();
    const destination = references.get(key);
    return destination && isAllowedLink(destination, internalBaseUrl, allowed) ? match : text;
  });
  sanitized = sanitized.replace(/^ {0,3}\[([^\]\n]+)\]:\s*(?:<([^>\n]+)>|(\S+)).*$(?:\r?\n)?/gm, (match, reference: string, bracketed: string | undefined, plain: string | undefined) => {
    const destination = bracketed || plain;
    return destination && isAllowedLink(destination, internalBaseUrl, allowed) ? match : "";
  });
  return sanitized.replace(/(?<!\\)<(https?:\/\/[^>\s]+)>/g, (match, destination: string) => (
    isAllowedLink(destination, internalBaseUrl, allowed) ? match : destination
  ));
}

function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?(?:\[([^\]]*)\])\([^)]*\)/g, "$1")
    .replace(/[`*_~>#|]/g, " ")
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length || 0;
}

function headings(markdown: string): Array<{ level: number; text: string; line: number }> {
  return markdown.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(HEADING);
    return match ? [{ level: match[1].length, text: match[2].trim(), line: index + 1 }] : [];
  });
}

function sectionBody(markdown: string, section: { level: number; line: number }): string {
  const lines = markdown.split(/\r?\n/);
  const body: string[] = [];
  for (let index = section.line; index < lines.length; index += 1) {
    const next = lines[index].match(HEADING);
    if (next && next[1].length <= section.level) break;
    body.push(lines[index]);
  }
  return body.join("\n").trim();
}

function validateHeadingHierarchy(markdown: string): void {
  const articleHeadings = headings(markdown);
  const h1s = articleHeadings.filter((heading) => heading.level === 1);
  if (h1s.length !== 1) throw new Error("Artikel harus memiliki tepat satu H1 asli");
  if (articleHeadings[0]?.level !== 1) throw new Error("H1 harus menjadi heading pertama artikel");

  let previousLevel = 1;
  for (const heading of articleHeadings.slice(1)) {
    if (heading.level > previousLevel + 1) {
      throw new Error(`Hierarki heading melompati level pada baris ${heading.line}`);
    }
    previousLevel = heading.level;
  }
}

function validateRequiredSections(markdown: string, input: GenerationInput): void {
  const articleHeadings = headings(markdown);
  if (input.withConclusion) {
    const conclusion = articleHeadings.find((heading) => /\b(kesimpulan|penutup)\b/i.test(heading.text));
    if (!conclusion || countWords(sectionBody(markdown, conclusion)) < 35) {
      throw new Error("Artikel harus memiliki heading kesimpulan dengan isi substantif");
    }
  }

  if (input.withFAQ) {
    const faq = articleHeadings.find((heading) => /\b(faq|pertanyaan(?:\s+yang)?\s+sering\s+ditanyakan|pertanyaan\s+umum)\b/i.test(heading.text));
    if (!faq) throw new Error("Artikel harus memiliki heading FAQ");

    const body = sectionBody(markdown, faq);
    const questions = body.split(/\r?\n/).filter((line) => {
      const heading = line.match(HEADING);
      return Boolean(heading && QUESTION.test(heading[2])) || /^\s*(?:[-*]|\d+[.)])\s+.+\?\s*$/.test(line) || /^\s*\*\*[^*]+\?\*\*\s*$/.test(line);
    });
    if (questions.length < 2 || countWords(body) < 60) {
      throw new Error("FAQ harus memuat minimal dua pertanyaan dan jawaban substantif");
    }
  }
}

function validateCompleteMarkdown(markdown: string): void {
  const fenceCount = (markdown.match(/^\s*```/gm) || []).length;
  if (fenceCount % 2 !== 0) throw new Error("Markdown memiliki code fence yang tidak ditutup");
  if (/\n\s*(?:#{1,6}\s+[^\n]*|[-*+]\s+[^\n]*|\d+[.)]\s+[^\n]*|>\s*[^\n]*)\s*$/.test(markdown)) {
    throw new Error("Artikel terpotong pada elemen Markdown");
  }
  if (/\[[^\]\n]*\]\([^)]*$/.test(markdown)) throw new Error("Markdown memiliki tautan yang tidak lengkap");

  const endingText = markdown.replace(/\s+/g, " ").replace(/[*_`>#]/g, "").trim();
  if (!/[.!?…]$/.test(endingText)) throw new Error("Artikel terpotong di tengah kalimat");
}

export interface ValidatedDraft {
  contentMarkdown: string;
  wordCount: number;
}

export function validateDraft(
  draft: string,
  input: GenerationInput,
  requestedMinimum: number,
  internalLinks: string[],
  externalLinks: string[],
): ValidatedDraft {
  const base = normalizeInternalBaseUrl(input.internalLinkBaseUrl);
  const contentMarkdown = removeUnapprovedMarkdownLinks(draft.trim(), base, internalLinks, externalLinks);
  if (!contentMarkdown) throw new Error("Artikel akhir kosong");

  validateCompleteMarkdown(contentMarkdown);
  validateHeadingHierarchy(contentMarkdown);
  validateRequiredSections(contentMarkdown, input);

  const outputMarkdown = contentMarkdown.replace(/^#\s+.*(?:\r?\n)+/, "").trim();
  const wordCount = countWords(outputMarkdown);
  if (wordCount < requestedMinimum) {
    throw new Error(`Jumlah kata artikel (${wordCount}) belum mencapai minimum yang diminta (${requestedMinimum})`);
  }

  return { contentMarkdown: outputMarkdown, wordCount };
}
