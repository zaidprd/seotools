import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEOTulis.AI — Generator Konten SEO Indonesia #1",
  description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik. Auto-publish ke WordPress. Dipakai ratusan blogger Indonesia.",
  keywords: "AI konten SEO Indonesia, generator artikel, WordPress auto publish, blog SEO",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          src={snapUrl}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          async
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
