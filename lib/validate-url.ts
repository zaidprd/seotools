/**
 * Validates that a URL is safe to make outbound requests to.
 * Blocks localhost, private IP ranges, and non-HTTP(S) protocols
 * to prevent Server-Side Request Forgery (SSRF) attacks.
 */
export function validateOutboundUrl(rawUrl: string): { safe: true; url: URL } | { safe: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "URL tidak valid" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, reason: "Hanya protokol HTTP/HTTPS yang diizinkan" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return { safe: false, reason: "URL localhost tidak diizinkan" };
  }

  // Block private IPv4 ranges: 10.x, 172.16-31.x, 192.168.x
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./, // link-local (AWS metadata)
    /^100\.64\./, // CGNAT
    /^0\./, // 0.0.0.0/8
  ];
  for (const pattern of privateRanges) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: "URL ke jaringan privat tidak diizinkan" };
    }
  }

  // Block cloud metadata endpoints
  const blockedHosts = ["metadata.google.internal", "169.254.169.254"];
  if (blockedHosts.includes(hostname)) {
    return { safe: false, reason: "URL tidak diizinkan" };
  }

  return { safe: true, url: parsed };
}
