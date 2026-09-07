export interface ArticleMeta {
  title: string;
  description: string;
  keywords: string[];
}

export interface GeneratedArticle {
  id?: string;
  title: string;
  slug: string;
  contentHtml: string;
  contentMarkdown: string;
  meta: ArticleMeta;
  schema: Record<string, unknown> | Array<Record<string, unknown>>;
  wordCount: number;
  creditsUsed: number;
}

export interface GenerationInput {
  keyword: string;
  title?: string;
  language: string;
  articleType: string;
  articleSize: string;
  tone: string;
  pov: string;
  readability: string;
  country: string;
  brandVoice?: string;
  details?: string;
  seoKeywords?: string;
  outline?: string;
  withConclusion: boolean;
  withTables: boolean;
  withH3: boolean;
  withLists: boolean;
  withNotes: boolean;
  withKeyTakeaways: boolean;
  withFAQ: boolean;
  withBold: boolean;
  withQuotes: boolean;
  internalLinkBaseUrl?: string;
  internalLinkPages?: string;
  externalLinkType: string;
  externalLinkUrls?: string;
  legacyPrompt?: string;
}
