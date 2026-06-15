import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/require-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const SVG_SYSTEM_PROMPT = `Kamu adalah generator ilustrasi SVG profesional untuk artikel blog.
Tugasmu: buat ilustrasi SVG yang relevan, bersih, dan menarik berdasarkan deskripsi pengguna.

ATURAN KETAT:
- Kembalikan HANYA kode SVG mentah, mulai dari <svg dan diakhiri </svg>
- JANGAN ada markdown, penjelasan, atau teks lain di luar SVG
- Gunakan viewBox="0 0 800 450" (landscape 16:9)
- Gunakan warna yang harmonis dan modern (hindari terlalu mencolok)
- Buat ilustrasi yang informatif dan relevan dengan topik
- Sertakan teks/label dalam bahasa Indonesia jika perlu
- Gunakan shapes sederhana tapi estetis: rect, circle, path, text, polygon
- Tambahkan <title> dan <desc> untuk aksesibilitas
- Gunakan gradient jika sesuai untuk tampilan lebih modern
- Ukuran font minimal 14px agar terbaca`;

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const { prompt, keyword } = await req.json();
  if (!prompt) return NextResponse.json({ error: "Deskripsi gambar diperlukan" }, { status: 400 });

  const baseUrl = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";
  const apiKey = process.env.SUMOPOD_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Konfigurasi server tidak lengkap" }, { status: 500 });

  const userPrompt = keyword
    ? `Buat ilustrasi SVG untuk artikel tentang "${keyword}". Gambar: ${prompt}`
    : `Buat ilustrasi SVG: ${prompt}`;

  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SVG_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "(no body)");
      console.error("[generate-svg] provider error:", r.status, errText);
      return NextResponse.json({ error: `Provider error (${r.status})` }, { status: 502 });
    }

    const data = await r.json();
    let svgText: string = data.choices?.[0]?.message?.content ?? "";

    // Bersihkan jika AI menambahkan markdown code block
    svgText = svgText.replace(/^```(?:svg|xml)?\s*/i, "").replace(/\s*```$/, "").trim();

    if (!svgText.startsWith("<svg")) {
      // Coba extract SVG dari dalam teks
      const match = svgText.match(/<svg[\s\S]*<\/svg>/i);
      if (!match) {
        return NextResponse.json({ error: "AI tidak menghasilkan SVG yang valid, coba deskripsi yang berbeda" }, { status: 422 });
      }
      svgText = match[0];
    }

    return NextResponse.json({ svg: svgText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-svg] error:", msg);
    return NextResponse.json({ error: `Gagal generate SVG: ${msg}` }, { status: 500 });
  }
}
