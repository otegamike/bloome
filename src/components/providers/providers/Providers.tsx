"use client";

import { SessionProvider } from "next-auth/react";

import { LiveRegion } from "@/components/ui/live-region/LiveRegion";
import { ToastHost } from "@/components/ui/toast-host/ToastHost";
import { isMockMode } from "@/client/mockMode";
import { ThemeSync } from "./ThemeSync";

export function Providers({ children }: { children: React.ReactNode }) {
  if (isMockMode()) {
    return (
      <>
        <ThemeSync signedIn={false} />
        {children}
        <ToastHost />
        <LiveRegion />
      </>
    );
  }
  return (
    <SessionProvider>
      <ThemeSync signedIn />
      {children}
      <ToastHost />
      <LiveRegion />
    </SessionProvider>
  );
}
