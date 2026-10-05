import { create } from "zustand";

import { patchMe } from "@/client/apiClient";
import type { ThemeName } from "@/types";

// TEMPORARY fallback: THEME_META lives in backend-owned
// src/lib/shared/config.ts and is not there yet. Delete this map and import
// THEME_META from there once the backend branch merges.
export const THEME_META_FALLBACK: Record<ThemeName, string> = {
  blush: "#fff8f6",
  rose: "#fbeff2",
  peach: "#fffbf7",
};

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName, opts?: { persist?: boolean }) => void;
  initFromDom: () => void;
}

function applyTheme(theme: ThemeName): void {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.dataset.theme = theme;
  window.setTimeout(() => root.classList.remove("theme-transition"), 450);
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_META_FALLBACK[theme]);
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "blush",
  setTheme: (theme, opts) => {
    set({ theme });
    if (typeof document !== "undefined") {
      applyTheme(theme);
    }
    if (opts?.persist) {
      patchMe({ theme }).catch(() => {
        // The profile store reports user-visible errors; theme already applied.
      });
    }
  },
  initFromDom: () => {
    const current = document.documentElement.dataset.theme;
    if (current === "blush" || current === "rose" || current === "peach") {
      set({ theme: current });
    }
  },
}));
