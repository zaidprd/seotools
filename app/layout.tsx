import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://seo.zaidly.com"),
  title: {
    default: "Artikel SEO — Generator Konten SEO Indonesia #1",
    template: "%s | Artikel SEO",
  },
  description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik. Auto-publish ke WordPress. Dipakai ratusan blogger Indonesia.",
  keywords: "AI konten SEO Indonesia, generator artikel SEO, WordPress auto publish, blog SEO, artikel SEO otomatis",
  authors: [{ name: "Artikel SEO", url: "https://seo.zaidly.com" }],
  creator: "Artikel SEO",
  publisher: "Artikel SEO",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://seo.zaidly.com",
    siteName: "Artikel SEO",
    title: "Artikel SEO — Generator Konten SEO Indonesia #1",
    description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik. Auto-publish ke WordPress.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Artikel SEO — Generator Konten SEO Indonesia #1",
    description: "Buat artikel SEO berkualitas tinggi dalam Bahasa Indonesia dengan 1 klik.",
  },
  alternates: {
    canonical: "https://seo.zaidly.com",
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
