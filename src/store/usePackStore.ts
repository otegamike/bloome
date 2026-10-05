import { create } from "zustand";

import {
  ApiClientError,
  createPack as apiCreatePack,
  deletePack as apiDeletePack,
  handleAuthError,
  listPacks,
  updatePack as apiUpdatePack,
} from "@/client/apiClient";
import { useAlertStore } from "@/store/useAlertStore";
import { useCalendarStore } from "@/store/useCalendarStore";
import type { PackDTO } from "@/types/api";

type Status = "idle" | "loading" | "ready" | "error";

interface PackState {
  packs: PackDTO[];
  status: Status;
  fetchPacks: () => Promise<void>;
  createPack: (input: {
    name: string;
    activeDays: number;
    placeboDays: number;
    startDay: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  updatePack: (
    id: string,
    input: { name?: string; activeDays?: number; placeboDays?: number; startDay?: string },
  ) => Promise<{ ok: boolean; message?: string }>;
  deletePack: (id: string) => Promise<boolean>;
  currentPack: () => PackDTO | null;
}

export const usePackStore = create<PackState>((set, get) => ({
  packs: [],
  status: "idle",
  fetchPacks: async () => {
    set({ status: "loading" });
    try {
      const { packs } = await listPacks();
      set({ packs, status: "ready" });
    } catch (error) {
      handleAuthError(error);
      set({ status: "error" });
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't load your packs. Try again?",
      });
    }
  },
  createPack: async (input) => {
    try {
      await apiCreatePack(input);
      await get().fetchPacks();
      useCalendarStore.getState().invalidateAll();
      return { ok: true };
    } catch (error) {
      handleAuthError(error);
      if (error instanceof ApiClientError && error.status === 409) {
        return { ok: false, message: "A pack already starts on that day" };
      }
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't save that. Tap to try again.",
      });
      return { ok: false };
    }
  },
  updatePack: async (id, input) => {
    try {
      await apiUpdatePack(id, input);
      await get().fetchPacks();
      useCalendarStore.getState().invalidateAll();
      return { ok: true };
    } catch (error) {
      handleAuthError(error);
      if (error instanceof ApiClientError && error.status === 409) {
        return { ok: false, message: "A pack already starts on that day" };
      }
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't save that. Tap to try again.",
      });
      return { ok: false };
    }
  },
  deletePack: async (id) => {
    try {
      await apiDeletePack(id);
      await get().fetchPacks();
      useCalendarStore.getState().invalidateAll();
      return true;
    } catch (error) {
      handleAuthError(error);
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't delete that pack. Try again?",
      });
      return false;
    }
  },
  currentPack: () => {
    const packs = get().packs;
    return packs.find((p) => p.isCurrent) ?? packs[0] ?? null;
  },
}));
