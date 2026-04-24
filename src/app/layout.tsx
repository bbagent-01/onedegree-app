import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import "./globals.css";

const SITE_NAME = "Trustead";
const SITE_DESCRIPTION =
  "Stay with people you trust. Private home stays through trusted personal networks.";
const OG_IMAGE = "/trustead-og.svg";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/trustead-favicon.svg", type: "image/svg+xml" },
      { url: "/trustead-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/trustead-favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/trustead-favicon-192.png",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          {children}
          <Toaster />
          <CookieBanner />
        </body>
      </html>
    </ClerkProvider>
  );
}
