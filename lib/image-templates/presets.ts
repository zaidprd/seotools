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
  { id: "amber", name: "Amber", primary: "#f59e0b", secondary: "#fbbf24", foreground: "#0f172a" },
  { id: "cyan", name: "Cyan", primary: "#06b6d4", secondary: "#67e8f9", foreground: "#082f49" },
  { id: "violet", name: "Violet", primary: "#8b5cf6", secondary: "#c4b5fd", foreground: "#1e1b4b" },
  { id: "rose", name: "Rose", primary: "#f43f5e", secondary: "#fda4af", foreground: "#4c0519" },
  { id: "emerald", name: "Emerald", primary: "#10b981", secondary: "#6ee7b7", foreground: "#022c22" },
] as const;

export const DEFAULT_IMAGE_ACCENT = IMAGE_ACCENT_PALETTES[0];
