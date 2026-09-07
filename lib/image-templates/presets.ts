import type { ImageAccentPalette, ImageTemplatePreset } from "./types";

export const IMAGE_TEMPLATE_PRESETS: readonly ImageTemplatePreset[] = [
  { id: "faceless-editorial", name: "Editorial Ceria", description: "Kartu digital yang ekspresif dan berani" },
  { id: "data-dashboard", name: "Dasbor Data", description: "Analitik bersih dengan grafik dekoratif" },
  { id: "technical-blueprint", name: "Cetak Biru", description: "Poster teknis dengan detail geometris" },
  { id: "tutorial-cards", name: "Kartu Tutorial", description: "Langkah visual yang ramah dan terarah" },
  { id: "islamic-geometric", name: "Geometri Islami", description: "Ornamen elegan yang sepenuhnya nonfiguratif" },
  { id: "minimal-object", name: "Objek Minimal", description: "Still-life meja yang tenang dan premium" },
] as const;

export const IMAGE_ACCENT_PALETTES: readonly ImageAccentPalette[] = [
  { id: "brand-green", name: "Hijau merek", primary: "#10b981", secondary: "#6ee7b7", foreground: "#1e293b" },
  { id: "brand-blue", name: "Biru merek", primary: "#2563eb", secondary: "#60a5fa", foreground: "#ffffff" },
  { id: "brand-navy", name: "Navy merek", primary: "#1e293b", secondary: "#475569", foreground: "#ffffff" },
] as const;

export const DEFAULT_IMAGE_ACCENT = IMAGE_ACCENT_PALETTES[0];
