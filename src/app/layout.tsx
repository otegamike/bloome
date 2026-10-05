import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { cookies } from "next/headers";

import { APP_NAME, THEMES } from "@/lib/shared/config";
import { Providers } from "@/components/providers/providers/Providers";
import type { ThemeName } from "@/types";
import "@/styles/globals.css";

// TEMPORARY fallback: THEME_META lives in backend-owned
// src/lib/shared/config.ts and is not there yet. Delete this map and import
// THEME_META from there once the backend branch merges.
const THEME_META_FALLBACK: Record<ThemeName, string> = {
  blush: "#fff8f6",
  rose: "#fbeff2",
  peach: "#fffbf7",
};

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A gentle daily check-in",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: THEME_META_FALLBACK.blush,
  viewportFit: "cover",
};

function themeFromCookie(value: string | undefined): ThemeName {
  if (value && (THEMES as string[]).includes(value)) {
    return value as ThemeName;
  }
  return "blush";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = themeFromCookie(store.get("theme")?.value);
  return (
    <html lang="en" data-theme={theme} className={`${fraunces.variable} ${nunito.variable}`}>
      <head>
        <meta name="theme-color" content={THEME_META_FALLBACK[theme]} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
