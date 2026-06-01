export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  badge: string;
  credits: number;
}

// Model yang tersedia — tanpa Claude (terlalu mahal)
export const MODELS: ModelInfo[] = [
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", provider: "Google", badge: "GRATIS", credits: 1 },
  { id: "gemini-2.5-flash",      label: "Gemini 2.5 Flash",      provider: "Google", badge: "PRO",    credits: 2 },
  { id: "deepseek/deepseek-chat",label: "DeepSeek V3",           provider: "DeepSeek", badge: "PRO",  credits: 2 },
  { id: "gpt-4o-mini",           label: "GPT-4o Mini",           provider: "OpenAI",  badge: "PRO",   credits: 3 },
  { id: "gpt-4o",                label: "GPT-4o",                provider: "OpenAI",  badge: "PRO",   credits: 5 },
];

export const FREE_MODEL_ID    = "gemini-2.5-flash-lite";
export const FREE_MODEL_LABEL = "Gemini 2.5 Flash-Lite";
export const FREE_CREDITS     = 1; // gratis 1 kredit selamanya
export const FREE_MAX_WORDS   = "Sedang (1000–1500 kata)"; // max artikel gratis

// Biaya kredit per model
export const CREDIT_COST: Record<string, number> = {
  "gemini-2.5-flash-lite":    1,
  "gemini-2.5-flash":         2,
  "deepseek/deepseek-chat":   2,
  "gpt-4o-mini":              3,
  "gpt-4o":                   5,
};

export const LANGUAGES     = ["Indonesia","English (US)","English (UK)","Melayu","Jawa","Sunda","Arabic","Spanish","French","German","Japanese","Korean","Chinese"];
export const ARTICLE_TYPES = ["Blog Post","Artikel Berita","Review Produk","Panduan (How-to)","Listicle","Opini","Produk Roundup","Press Release","Landing Page","Email"];
export const ARTICLE_SIZES = ["Mini (300–500 kata)","Pendek (500–800 kata)","Sedang (1000–1500 kata)","Panjang (2000–3000 kata)","Sangat Panjang (4000–5000 kata)"];
export const TONES         = ["Ramah","Profesional","Santai","Persuasif","Informatif","Humoris","Formal","Empatik","Otoritatif","Inspiratif"];
export const POVS          = ["Orang Pertama (Saya)","Orang Ketiga","Umum (Anda/Kita)","Netral"];
export const READABILITY   = ["Sederhana (SMP)","Menengah (SMA)","Tinggi (Kuliah)","Ahli"];
export const COUNTRIES     = ["Indonesia","Malaysia","Singapore","Australia","United States","United Kingdom"];
export const LINK_TYPES    = ["Tidak Ada","Otomatis","Manual"];
export const IMG_STYLES    = ["Foto","Ilustrasi","Vektor","Realistis","Minimalis","Infografis"];
export const IMG_SIZES     = ["Kecil 400px","Sedang 800px","Besar 1200px","Full Width"];
export const IMG_COUNTS    = ["1","2","3","4","5","6"];
export const YT_COUNTS     = ["0","1","2","3"];
export const LAYOUT_OPTS   = ["Satu Gambar & Satu Teks","Gambar di Kiri","Gambar di Kanan","Gambar Penuh"];

export const PROVIDER_COLORS: Record<string, string> = {
  Google:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  OpenAI:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  DeepSeek: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export interface Synds {
  twitter: boolean; linkedin: boolean; facebook: boolean;
  email: boolean; wa: boolean; pinterest: boolean;
}

export interface Config {
  language: string; articleType: string; articleSize: string; tone: string; pov: string;
  readability: string; country: string; aiCleaning: boolean; brandVoice: string; details: string;
  seoKeywords: string; imgCount: string; imgSize: string; imgStyle: string; imgInstructions: string;
  imgBrand: string; imgFirstKeyword: boolean; imgAltText: boolean; ytCount: string; ytLayout: string;
  mediaUnderHeading: boolean; introType: string; introBrief: string; withConclusion: boolean;
  withTables: boolean; withH3: boolean; withLists: boolean; withNotes: boolean; withOutlineEl: boolean;
  withKeyTakeaways: boolean; withFAQ: boolean; withBold: boolean; withQuotes: boolean;
  internalLinkSite: string; extLinkType: string; connectWeb: boolean; synds: Synds;
  syndLink: string; saveFolder: string; postStatus: string;
  keyword?: string; title?: string; extraKeywords?: string; outline?: string;
}

export const defaultCfg = (): Config => ({
  language: "Indonesia", articleType: "Blog Post", articleSize: "Sedang (1000–1500 kata)",
  tone: "Ramah", pov: "Umum (Anda/Kita)", readability: "Menengah (SMA)", country: "Indonesia",
  aiCleaning: false, brandVoice: "", details: "", seoKeywords: "",
  imgCount: "3", imgSize: "Sedang 800px", imgStyle: "Foto", imgInstructions: "", imgBrand: "",
  imgFirstKeyword: true, imgAltText: true, ytCount: "0", ytLayout: "Satu Gambar & Satu Teks",
  mediaUnderHeading: true, introType: "Hook", introBrief: "",
  withConclusion: true, withTables: false, withH3: true, withLists: true, withNotes: false,
  withOutlineEl: false, withKeyTakeaways: false, withFAQ: true, withBold: true, withQuotes: false,
  internalLinkSite: "Tidak Ada", extLinkType: "Tidak Ada", connectWeb: false,
  synds: { twitter: false, linkedin: false, facebook: false, email: false, wa: false, pinterest: false },
  syndLink: "Tidak Ada", saveFolder: "Home", postStatus: "draft",
});

export interface WPSite { id: number; name: string; url: string; user: string; pass: string; }

export interface UserData {
  id: string; email: string; plan: string;
  credits: number; credits_used: number; articles_used: number;
}

export const PLANS = [
  {
    id: "free", name: "Gratis", price: 0, priceLabel: "Rp 0", period: "selamanya",
    credits: 1, maxWords: "1.500 kata",
    features: ["1 artikel selamanya", "Maks 1.500 kata", "Gemini Flash-Lite", "Export manual"],
    cta: "Mulai Gratis", highlight: false,
  },
  {
    id: "starter", name: "Starter", price: 99000, priceLabel: "Rp 99rb", period: "/bulan",
    credits: 100, maxWords: "5.000 kata",
    features: ["100 kredit/bulan", "Semua model AI", "Auto-publish WordPress", "Bulk generation", "Priority support"],
    cta: "Pilih Starter", highlight: false,
  },
  {
    id: "pro", name: "Pro", price: 199000, priceLabel: "Rp 199rb", period: "/bulan",
    credits: 300, maxWords: "5.000 kata",
    features: ["300 kredit/bulan", "Semua model AI", "Unlimited situs WordPress", "Bulk hingga 100 artikel", "Sindikasi konten", "Priority support"],
    cta: "Pilih Pro", highlight: true,
  },
  {
    id: "agency", name: "Agency", price: 499000, priceLabel: "Rp 499rb", period: "/bulan",
    credits: 1000, maxWords: "5.000 kata",
    features: ["1.000 kredit/bulan", "Semua model AI", "Situs WordPress unlimited", "Bulk hingga 500 artikel", "API access", "White-label", "Dedicated support"],
    cta: "Pilih Agency", highlight: false,
  },
];
