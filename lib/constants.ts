export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  badge: string;
  credits: number;
}

// Model yang tersedia — lewat proxy OpenAI-compatible.
// JoinBareng = provider utama (fixed). "Custom" = slot bebas yang dikonfigurasi
// via env (CUSTOM_AI_BASE_URL / CUSTOM_AI_KEY / CUSTOM_AI_MODEL) — mis. SumoPod,
// OpenRouter, atau provider lain. Ganti model cukup ubah env + redeploy.
export const MODELS: ModelInfo[] = [
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", provider: "JoinBareng", badge: "GRATIS", credits: 1 },
  { id: "gpt-5.2",      label: "GPT-5.2",      provider: "JoinBareng", badge: "PRO",    credits: 2 },
  { id: "gpt-5.4",      label: "GPT-5.4",      provider: "JoinBareng", badge: "PRO",    credits: 3 },
  { id: "gpt-5.5",      label: "GPT-5.5",      provider: "JoinBareng", badge: "MAX",    credits: 5 },
  { id: "custom",       label: "Custom (env)", provider: "Custom",     badge: "PRO",    credits: 3 },
];

export const FREE_MODEL_ID    = "gpt-5.4-mini";
export const FREE_MODEL_LABEL = "GPT-5.4 Mini";
export const FREE_CREDITS     = 1;
export const FREE_MAX_WORDS   = "Standar (800–1.000 kata)";

// Biaya kredit per model
export const CREDIT_COST: Record<string, number> = {
  "gpt-5.4-mini": 1,
  "gpt-5.2":      2,
  "gpt-5.4":      3,
  "gpt-5.5":      5,
  "custom":       3,
};

export const LANGUAGES     = ["Indonesia","English (US)","English (UK)","Melayu","Jawa","Sunda","Arabic","Spanish","French","German","Japanese","Korean","Chinese"];
export const ARTICLE_TYPES = ["Blog Post","Artikel Berita","Review Produk","Panduan (How-to)","Listicle","Opini","Produk Roundup","Press Release","Landing Page","Email"];
export const ARTICLE_SIZES = ["Mini (300–500 kata)","Pendek (500–800 kata)","Standar (800–1.000 kata)","Sedang (1.000–1.500 kata)","Panjang (1.500–2.000 kata)","Maksimal (2.000–2.500 kata)"];
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
  JoinBareng: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Custom:     "text-violet-400 bg-violet-500/10 border-violet-500/20",
  Google:     "text-blue-400 bg-blue-500/10 border-blue-500/20",
  OpenAI:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  DeepSeek:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export interface Synds {
  twitter: boolean; linkedin: boolean; facebook: boolean;
  email: boolean; wa: boolean; pinterest: boolean;
}

export interface Config {
  language: string; articleType: string; articleSize: string; tone: string; pov: string;
  readability: string; country: string; aiCleaning: boolean; brandVoice: string; details: string;
  seoKeywords: string; imgCount: string; imgSize: string; imgStyle: string; imgInstructions: string;
  imgBrand: string; imgFirstKeyword: boolean; imgAltText: boolean; imgPrompt: string; ytCount: string; ytLayout: string;
  mediaUnderHeading: boolean; introType: string; introBrief: string; withConclusion: boolean;
  withTables: boolean; withH3: boolean; withLists: boolean; withNotes: boolean; withOutlineEl: boolean;
  withKeyTakeaways: boolean; withFAQ: boolean; withBold: boolean; withQuotes: boolean;
  internalLinkSite: string;
  internalLinkBaseUrl: string;  // base URL situs untuk internal link (cth: https://example.com)
  internalLinkPages: string;    // daftar halaman manual (satu URL/judul per baris)
  extLinkType: string;
  extLinkUrls: string;          // daftar URL external manual (satu per baris, mode Manual)
  connectWeb: boolean; synds: Synds;
  syndLink: string; saveFolder: string; postStatus: string; scheduleDate?: string;
  keyword?: string; title?: string; extraKeywords?: string; outline?: string;
}

export const defaultCfg = (): Config => ({
  language: "Indonesia", articleType: "Blog Post", articleSize: "Sedang (1.000–1.500 kata)",
  tone: "Ramah", pov: "Umum (Anda/Kita)", readability: "Menengah (SMA)", country: "Indonesia",
  aiCleaning: false, brandVoice: "", details: "", seoKeywords: "",
  imgCount: "0", imgSize: "Sedang 800px", imgStyle: "Foto", imgInstructions: "", imgBrand: "",
  imgFirstKeyword: true, imgAltText: true, imgPrompt: "", ytCount: "0", ytLayout: "Satu Gambar & Satu Teks",
  mediaUnderHeading: true, introType: "Hook", introBrief: "",
  withConclusion: true, withTables: false, withH3: true, withLists: true, withNotes: false,
  withOutlineEl: false, withKeyTakeaways: false, withFAQ: true, withBold: true, withQuotes: false,
  internalLinkSite: "Tidak Ada", internalLinkBaseUrl: "", internalLinkPages: "",
  extLinkType: "Tidak Ada", extLinkUrls: "", connectWeb: false,
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
    id: "free", name: "Gratis", price: 0, priceLabel: "Rp 0", period: "sekali coba",
    credits: 1, maxWords: "1.000 kata", maxSites: 0, maxBulk: 0,
    canSchedule: false, canSyndicate: false, priority: false, imageSource: "upload",
    features: ["1 artikel uji gratis", "Maks 1.000 kata", "Model GPT-5.4 Mini", "Editor artikel built-in", "Export manual"],
    cta: "Coba Gratis", highlight: false,
  },
  {
    id: "starter", name: "Starter", price: 49000, priceLabel: "Rp 49rb", period: "/bulan",
    credits: 25, maxWords: "2.000 kata", maxSites: 1, maxBulk: 10,
    canSchedule: true, canSyndicate: false, priority: false, imageSource: "imagen",
    features: ["25 kredit/bulan", "Maks 2.000 kata", "Semua model AI", "1 situs WordPress", "Bulk max 10 artikel", "Schedule publish", "Generate gambar AI otomatis", "Editor artikel built-in", "Email support"],
    cta: "Pilih Starter", highlight: false,
  },
  {
    id: "pro", name: "Pro", price: 99000, priceLabel: "Rp 99rb", period: "/bulan",
    credits: 60, maxWords: "2.500 kata", maxSites: 3, maxBulk: 30,
    canSchedule: true, canSyndicate: true, priority: true, imageSource: "imagen",
    features: ["60 kredit/bulan", "Maks 2.500 kata", "Semua model AI", "3 situs WordPress", "Bulk max 30 artikel", "Schedule publish", "Sindikasi konten", "Generate gambar AI otomatis", "Editor artikel + SEO checker", "Priority generate", "Priority support"],
    cta: "Pilih Pro", highlight: true,
  },
];
