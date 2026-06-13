// Client API Mayar.id (headless) — https://docs.mayar.id
// Produksi: https://api.mayar.id/hl/v1 | Sandbox: https://api.mayar.club/hl/v1

function getBaseUrl(): string {
  return process.env.MAYAR_IS_PRODUCTION === "true"
    ? "https://api.mayar.id/hl/v1"
    : "https://api.mayar.club/hl/v1";
}

function getApiKey(): string | undefined {
  return process.env.MAYAR_API_KEY;
}

/** true jika API key Mayar terkonfigurasi */
export function isMayarConfigured(): boolean {
  return Boolean(getApiKey());
}

export interface MayarInvoice {
  id: string;
  transactionId: string;
  link: string;
}

export async function createInvoice(params: {
  name: string;
  email: string;
  mobile?: string;
  amount: number;
  description: string;
  redirectUrl: string;
}): Promise<MayarInvoice> {
  const res = await fetch(`${getBaseUrl()}/invoice/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      mobile: params.mobile || "0800000000",
      redirectUrl: params.redirectUrl,
      description: params.description,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      items: [{ quantity: 1, rate: params.amount, description: params.description }],
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data?.id) {
    throw new Error(data?.messages || `Gagal membuat invoice Mayar (HTTP ${res.status})`);
  }
  return {
    id: data.data.id,
    transactionId: data.data.transactionId,
    link: data.data.link,
  };
}

export type MayarInvoiceStatus = "unpaid" | "paid" | "closed";

/** Cek status invoice langsung ke API Mayar — jangan percaya callback browser/webhook */
export async function getInvoiceStatus(
  invoiceId: string
): Promise<{ status: MayarInvoiceStatus; amount: number }> {
  const res = await fetch(`${getBaseUrl()}/invoice/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.data) {
    throw new Error(`Gagal mengecek status invoice (HTTP ${res.status})`);
  }
  return { status: data.data.status as MayarInvoiceStatus, amount: data.data.amount };
}
