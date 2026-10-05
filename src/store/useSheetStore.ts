import { create } from "zustand";

import type { DayString } from "@/types";

interface SheetState {
  day: DayString | null;
  open: (day: DayString) => void;
  close: () => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  day: null,
  open: (day) => set({ day }),
  close: () => set({ day: null }),
}));
