import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artikel SEO — Generator Konten SEO Indonesia #1",
  description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik. Auto-publish ke WordPress. Dipakai ratusan blogger Indonesia.",
  keywords: "AI konten SEO Indonesia, generator artikel SEO, WordPress auto publish, blog SEO, artikel SEO otomatis",
  metadataBase: new URL("https://seo.zaidly.com"),
  alternates: { canonical: "https://seo.zaidly.com" },
  openGraph: {
    title: "Artikel SEO — Generator Konten SEO Indonesia #1",
    description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik. Auto-publish ke WordPress.",
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
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
