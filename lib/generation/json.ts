export function parseJsonObject(value: string): Record<string, unknown> {
  const unfenced = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Structured response tidak berisi objek JSON");
  const parsed: unknown = JSON.parse(unfenced.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Structured response bukan objek JSON");
  return parsed as Record<string, unknown>;
}
