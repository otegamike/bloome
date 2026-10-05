"use client";

import { useEffect } from "react";

import { useProfileStore } from "@/store/useProfileStore";
import { useThemeStore } from "@/store/useThemeStore";

/** Reconciles the cookie theme with the signed-in user's saved theme. */
export function ThemeSync({ signedIn }: { signedIn: boolean }) {
  const fetchMe = useProfileStore((s) => s.fetchMe);

  useEffect(() => {
    useThemeStore.getState().initFromDom();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let cancelled = false;
    fetchMe().then(() => {
      if (cancelled) {
        return;
      }
      const me = useProfileStore.getState().me;
      if (me && me.theme !== useThemeStore.getState().theme) {
        useThemeStore.getState().setTheme(me.theme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, fetchMe]);

  return null;
}
