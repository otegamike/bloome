import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import { APP_DESCRIPTION, APP_NAME, THEMES } from "@/lib/shared/config";
import type { ThemeName } from "@/types";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f6d3dd",
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
    <html lang="en" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
