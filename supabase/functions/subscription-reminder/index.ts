/**
 * Supabase Edge Function: subscription-reminder
 *
 * Kirim email reminder H-7 dan notif expired ke user.
 * Deploy: supabase functions deploy subscription-reminder
 *
 * Schedule (via Supabase Dashboard > Database > Cron):
 *   Cron: 0 8 * * *   (setiap hari jam 8 pagi UTC)
 *   Command: SELECT net.http_post(
 *     url := 'https://<project-ref>.supabase.co/functions/v1/subscription-reminder',
 *     headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *   );
 *
 * Env vars yang dibutuhkan (set via supabase secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SITE_URL
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL       = Deno.env.get("SITE_URL")       ?? "https://seo.zaidly.com";
const FROM_EMAIL     = "Artikel SEO <noreply@seo.zaidly.com>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) { console.warn("RESEND_API_KEY tidak di-set, skip email"); return; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!r.ok) console.error("Resend error:", await r.text());
}

Deno.serve(async (req) => {
  // Hanya izinkan POST dari Supabase cron atau manual trigger
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();

  // === 1. Reminder H-7 ===
  const h7Date = new Date(now);
  h7Date.setDate(h7Date.getDate() + 7);
  const h7Start = new Date(h7Date); h7Start.setHours(0, 0, 0, 0);
  const h7End   = new Date(h7Date); h7End.setHours(23, 59, 59, 999);

  const { data: expiringSoon } = await supabase
    .from("users")
    .select("id, email, plan, plan_expires_at, full_name")
    .neq("plan", "free")
    .neq("role", "admin")
    .gte("plan_expires_at", h7Start.toISOString())
    .lte("plan_expires_at", h7End.toISOString());

  let reminderCount = 0;
  for (const user of expiringSoon ?? []) {
    const name = user.full_name || user.email.split("@")[0];
    const expiry = new Date(user.plan_expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    await sendEmail(
      user.email,
      `⏰ Paket ${(user.plan || "").toUpperCase()} kamu akan berakhir dalam 7 hari`,
      `
        <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#0c0e14;color:#e2e8f0;padding:32px;border-radius:16px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:24px;font-weight:900;color:#f59e0b;">SEO</span>
            <span style="font-size:24px;font-weight:300;color:#fbbf24;">Tulis</span>
            <span style="font-size:24px;font-weight:900;color:#f59e0b;">.AI</span>
          </div>
          <h1 style="font-size:20px;font-weight:800;margin-bottom:8px;">Hai ${name}!</h1>
          <p style="color:#94a3b8;margin-bottom:16px;">Paket <strong style="color:#fbbf24;">${(user.plan || "").toUpperCase()}</strong> kamu akan berakhir pada <strong style="color:#ffffff;">${expiry}</strong>.</p>
          <p style="color:#94a3b8;margin-bottom:24px;">Perpanjang sekarang agar akses ke semua fitur tidak terputus.</p>
          <a href="${SITE_URL}/account" style="display:inline-block;background:#f59e0b;color:#0c0e14;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:15px;">
            🔄 Perpanjang Sekarang
          </a>
          <p style="margin-top:32px;color:#475569;font-size:12px;">
            Butuh bantuan? Email kami di <a href="mailto:support@zaidly.com" style="color:#f59e0b;">support@zaidly.com</a>
          </p>
        </div>
      `
    );
    reminderCount++;
  }

  // === 2. Notif Expired (hari ini) ===
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const { data: justExpired } = await supabase
    .from("users")
    .select("id, email, plan, plan_expires_at, full_name")
    .neq("plan", "free")
    .neq("role", "admin")
    .gte("plan_expires_at", todayStart.toISOString())
    .lte("plan_expires_at", todayEnd.toISOString());

  let expiredCount = 0;
  for (const user of justExpired ?? []) {
    const name = user.full_name || user.email.split("@")[0];
    await sendEmail(
      user.email,
      `⚠️ Paket ${(user.plan || "").toUpperCase()} kamu sudah berakhir hari ini`,
      `
        <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#0c0e14;color:#e2e8f0;padding:32px;border-radius:16px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:24px;font-weight:900;color:#f59e0b;">SEO</span>
            <span style="font-size:24px;font-weight:300;color:#fbbf24;">Tulis</span>
            <span style="font-size:24px;font-weight:900;color:#f59e0b;">.AI</span>
          </div>
          <h1 style="font-size:20px;font-weight:800;margin-bottom:8px;">Hai ${name}!</h1>
          <p style="color:#94a3b8;margin-bottom:16px;">Paket <strong style="color:#fbbf24;">${(user.plan || "").toUpperCase()}</strong> kamu sudah berakhir hari ini.</p>
          <p style="color:#94a3b8;margin-bottom:8px;">Fitur berbayar seperti generate artikel, gambar AI, dan publish WordPress sementara tidak aktif.</p>
          <p style="color:#94a3b8;margin-bottom:24px;">Aktifkan kembali untuk melanjutkan.</p>
          <a href="${SITE_URL}/account" style="display:inline-block;background:#ef4444;color:#ffffff;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:15px;">
            ⚡ Aktifkan Kembali
          </a>
          <p style="margin-top:32px;color:#475569;font-size:12px;">
            Butuh bantuan? Email kami di <a href="mailto:support@zaidly.com" style="color:#f59e0b;">support@zaidly.com</a>
          </p>
        </div>
      `
    );
    // Downgrade plan ke free di DB
    await supabase.from("users").update({ plan: "free" }).eq("id", user.id);
    expiredCount++;
  }

  return new Response(
    JSON.stringify({ ok: true, reminderSent: reminderCount, expiredProcessed: expiredCount }),
    { headers: { "Content-Type": "application/json" } }
  );
});
