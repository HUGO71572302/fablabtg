import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AppToaster } from "@/components/ui/toaster";
import { PwaSetup } from "@/components/system/pwa";
import { ImageViewer } from "@/components/system/image-viewer";
import { SoundSettingsHost } from "@/components/system/sound-settings";
import { SITE } from "@/config/site";
import { ensureSeeded } from "@/db/seed";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: SITE.name },
  formatDetection: { telephone: true },
  icons: {
    icon: [{ url: "/favicon.png?v=5", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: SITE.themeColor.dark },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Active les animations de révélation uniquement si JavaScript s'exécute : sans JS, tout reste visible. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <AppToaster />
          <PwaSetup />
          <ImageViewer />
          <SoundSettingsHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
