import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrefsState {
  weekStartsOn: 0 | 1;
  dismissedTimezone: string[];
  setWeekStartsOn: (value: 0 | 1) => void;
  dismissTimezone: (timezone: string) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      weekStartsOn: 1,
      dismissedTimezone: [],
      setWeekStartsOn: (value) => set({ weekStartsOn: value }),
      dismissTimezone: (timezone) =>
        set((state) =>
          state.dismissedTimezone.includes(timezone)
            ? state
            : { dismissedTimezone: [...state.dismissedTimezone, timezone] },
        ),
    }),
    { name: "bloome.prefs" },
  ),
);
