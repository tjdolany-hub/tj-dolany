import type { Metadata } from "next";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
