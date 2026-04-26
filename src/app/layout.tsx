import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TJ Dolany – Fotbal a sokolovna",
    template: "%s | TJ Dolany",
  },
  description:
    "Tělovýchovná jednota Dolany u Jaroměře. Fotbal, sokolovna a komunitní akce v Královéhradeckém kraji.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://tjdolany.net"
  ),
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "TJ Dolany",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
                } catch(e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsOrganization",
              name: "TJ Dolany",
              sport: "Football",
              foundingDate: "1970",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Dolany 98",
                postalCode: "552 01",
                addressLocality: "Dolany u Jaroměře",
                addressRegion: "Královéhradecký kraj",
                addressCountry: "CZ",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: "50.3735",
                longitude: "15.9365",
              },
              email: "tjdolany@seznam.cz",
              telephone: "+420604864424",
              url: "https://tjdolany.net",
            }),
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>{children}</body>
    </html>
  );
}
