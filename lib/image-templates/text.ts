export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function normalizeText(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function wrapTitle(
  value: string,
  maxCharactersPerLine = 27,
  maxLines = 3,
): string[] {
  const words = normalizeText(value, "Untitled image").split(" ");
  const lines: string[] = [];
  let line = "";

  for (const originalWord of words) {
    let word = originalWord;
    while (word.length > maxCharactersPerLine) {
      if (line) {
        lines.push(line);
        line = "";
        if (lines.length === maxLines) break;
      }
      lines.push(word.slice(0, maxCharactersPerLine));
      word = word.slice(maxCharactersPerLine);
      if (lines.length === maxLines) break;
    }
    if (lines.length === maxLines) break;

    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharactersPerLine) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines && line) lines.push(line);

  const sourceWasTruncated = lines.join(" ").replace(/…$/, "") !== words.join(" ");
  if (sourceWasTruncated && lines.length > 0) {
    lines[lines.length - 1] = truncateText(lines[lines.length - 1], maxCharactersPerLine);
  }

  return lines.slice(0, maxLines);
}
