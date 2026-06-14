import { NextResponse } from "next/server";

// TEMPORARY DEBUG ENDPOINT — hapus setelah selesai diagnosa
export async function GET() {
  const key = process.env.JOINBARENG_API_KEY ?? "";
  const base = process.env.JOINBARENG_BASE_URL ?? "(tidak diset)";

  return NextResponse.json({
    key_length: key.length,
    key_start: key.slice(0, 10),
    key_end: key.slice(-6),
    base_url: base,
    has_key: key.length > 0,
  });
}
