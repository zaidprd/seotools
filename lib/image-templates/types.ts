export const IMAGE_TEMPLATE_WIDTH = 1200 as const;
export const IMAGE_TEMPLATE_HEIGHT = 630 as const;

export const IMAGE_TEMPLATE_IDS = [
  "faceless-editorial",
  "data-dashboard",
  "technical-blueprint",
  "tutorial-cards",
  "islamic-geometric",
  "minimal-object",
] as const;

export type ImageTemplateId = (typeof IMAGE_TEMPLATE_IDS)[number];

export interface ImageTemplatePreset {
  id: ImageTemplateId;
  name: string;
  description: string;
}

export interface ImageAccentPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  foreground: string;
}

export interface ImageTemplateInput {
  presetId: ImageTemplateId;
  title: string;
  keyword: string;
  brand: string;
  accent?: ImageAccentPalette;
}

export interface RenderedImageTemplate {
  presetId: ImageTemplateId;
  width: typeof IMAGE_TEMPLATE_WIDTH;
  height: typeof IMAGE_TEMPLATE_HEIGHT;
  svg: string;
  dataUrl: string;
}
