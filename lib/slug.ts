// Ubah teks (keyword/judul) jadi slug URL SEO: huruf kecil, tanda hubung, tanpa karakter aneh.
// Dipakai untuk slug WordPress agar permalink pendek & rapi (bukan judul panjang yang tak bisa diedit).
export function slugify(input: string): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // buang aksen / diacritics
    .replace(/[^a-z0-9\s-]/g, "")      // buang simbol (?, !, koma, dll)
    .replace(/\s+/g, "-")              // spasi -> tanda hubung
    .replace(/-+/g, "-")               // rapikan tanda hubung ganda
    .replace(/^-+|-+$/g, "")           // buang tanda hubung di ujung
    .slice(0, 60);                     // batasi panjang agar permalink ringkas
}
