import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artikel SEO — Dari Keyword ke WordPress",
  description: "Tulis, review, dan publikasikan artikel SEO berbahasa Indonesia ke WordPress dalam satu ruang kerja.",
  keywords: "AI konten SEO Indonesia, generator artikel SEO, WordPress auto publish, blog SEO, artikel SEO otomatis",
  metadataBase: new URL("https://seo.zaidly.com"),
  alternates: { canonical: "https://seo.zaidly.com" },
  openGraph: {
    title: "Artikel SEO — Dari Keyword ke WordPress",
    description: "Tulis, review, dan publikasikan artikel SEO berbahasa Indonesia dalam satu ruang kerja.",
    url: "https://seo.zaidly.com",
    siteName: "Artikel SEO",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
