"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_IMAGE_ACCENT,
  IMAGE_ACCENT_PALETTES,
  IMAGE_TEMPLATE_PRESETS,
  renderImageTemplate,
  type ImageAccentPalette,
  type ImageTemplateId,
  type RenderedImageTemplate,
} from "@/lib/image-templates";

export interface ImageTemplateGalleryProps {
  title: string;
  keyword: string;
  brand: string;
  selectedPresetId?: ImageTemplateId;
  initialAccentId?: string;
  onSelect?: (presetId: ImageTemplateId) => void;
  onTitleChange?: (title: string) => void;
  onUse?: (image: RenderedImageTemplate) => void;
  className?: string;
}

export default function ImageTemplateGallery({
  title,
  keyword,
  brand,
  selectedPresetId,
  initialAccentId,
  onSelect,
  onTitleChange,
  onUse,
  className = "",
}: ImageTemplateGalleryProps) {
  const [internalPresetId, setInternalPresetId] = useState<ImageTemplateId>(
    selectedPresetId ?? IMAGE_TEMPLATE_PRESETS[0].id,
  );
  const [imageTitle, setImageTitle] = useState(title);
  const [accentId, setAccentId] = useState(
    IMAGE_ACCENT_PALETTES.some(palette => palette.id === initialAccentId)
      ? initialAccentId!
      : DEFAULT_IMAGE_ACCENT.id,
  );

  useEffect(() => setImageTitle(title), [title]);

  const activePresetId = selectedPresetId ?? internalPresetId;
  const accent = IMAGE_ACCENT_PALETTES.find(palette => palette.id === accentId) ?? DEFAULT_IMAGE_ACCENT;
  const renderedImages = useMemo(() => {
    const entries = IMAGE_TEMPLATE_PRESETS.map(preset => [
      preset.id,
      renderImageTemplate({ presetId: preset.id, title: imageTitle, keyword, brand, accent }),
    ] as const);
    return new Map<ImageTemplateId, RenderedImageTemplate>(entries);
  }, [accent, brand, imageTitle, keyword]);

  const activeImage = renderedImages.get(activePresetId)!;

  function selectPreset(presetId: ImageTemplateId) {
    setInternalPresetId(presetId);
    onSelect?.(presetId);
  }

  function updateTitle(value: string) {
    setImageTitle(value);
    onTitleChange?.(value);
  }

  return (
    <section className={`overflow-hidden rounded-2xl border border-stone-200 bg-white/60 ${className}`}>
      <div className="flex flex-col gap-1 border-b border-stone-200 bg-stone-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-sm font-black tracking-wide text-slate-900">Gambar Unggulan</h2>
          <p className="mt-1 text-xs text-slate-500">Enam gaya ilustrasi nonfiguratif · 1200 × 630</p>
        </div>
        <span className="mt-2 w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 sm:mt-0">
          Tanpa AI
        </span>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)] lg:p-5">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-stone-300/70 bg-white shadow-2xl shadow-black/20">
            <img
              src={activeImage.dataUrl}
              alt={`Preview template ${activePresetId}: ${imageTitle || title}`}
              width={activeImage.width}
              height={activeImage.height}
              className="block aspect-[1200/630] h-auto w-full object-cover"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800">
                {IMAGE_TEMPLATE_PRESETS.find(preset => preset.id === activePresetId)?.name}
              </p>
              <p className="text-xs text-slate-500">
                              {IMAGE_TEMPLATE_PRESETS.find(preset => preset.id === activePresetId)?.description}
                            </p>
            </div>
            {onUse ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onUse(activeImage)}
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-400 active:scale-[0.98]"
                >
                  Jadikan Featured
                </button>
              </div>
            ) : (
              <span className="shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-xs text-slate-500">Preview desain</span>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="image-template-title" className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Judul Gambar
              </label>
              <span className="text-xs tabular-nums text-slate-500">{imageTitle.length}/180</span>
            </div>
            <textarea
              id="image-template-title"
              value={imageTitle}
              onChange={event => updateTitle(event.target.value)}
              rows={3}
              maxLength={180}
              placeholder="Masukkan judul featured image"
              className="w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500/60"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Warna Aksen</legend>
            <div className="flex flex-wrap gap-2">
              {IMAGE_ACCENT_PALETTES.map(palette => (
                <PaletteButton
                  key={palette.id}
                  palette={palette}
                  selected={palette.id === accent.id}
                  onClick={() => setAccentId(palette.id)}
                />
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Gaya Ilustrasi</p>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_TEMPLATE_PRESETS.map(preset => {
                const selected = preset.id === activePresetId;
                const image = renderedImages.get(preset.id)!;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectPreset(preset.id)}
                    className={`group overflow-hidden rounded-lg border text-left transition-all ${
                      selected
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                        : "border-stone-200 bg-white/70 hover:border-stone-300 hover:bg-white"
                    }`}
                  >
                    <img
                      src={image.dataUrl}
                      alt=""
                      aria-hidden="true"
                      width={image.width}
                      height={image.height}
                      className="aspect-[1200/630] w-full object-cover"
                    />
                    <span className={`block truncate px-2 py-1.5 text-xs font-bold ${selected ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-800"}`}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaletteButton({
  palette,
  selected,
  onClick,
}: {
  palette: ImageAccentPalette;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={palette.name}
      aria-label={`Gunakan palet ${palette.name}`}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-full border px-2 transition-all ${
        selected ? "border-slate-400 bg-stone-100" : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <span
        className="h-4 w-4 rounded-full ring-1 ring-white/10"
        style={{ background: `linear-gradient(135deg, ${palette.primary} 50%, ${palette.secondary} 50%)` }}
      />
      <span className={`text-xs ${selected ? "text-slate-800" : "text-slate-500"}`}>{palette.name}</span>
    </button>
  );
}
