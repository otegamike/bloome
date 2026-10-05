import { create } from "zustand";

import { deleteMe, getMe, handleAuthError, patchMe } from "@/client/apiClient";
import { useAlertStore } from "@/store/useAlertStore";
import type { MeResponse } from "@/types/api";
import type { ThemeName } from "@/types";

type Status = "idle" | "loading" | "ready" | "error";

interface ProfileState {
  me: MeResponse | null;
  status: Status;
  fetchMe: () => Promise<void>;
  updateMe: (input: {
    name?: string;
    timezone?: string;
    theme?: ThemeName;
    reminder?: { enabled?: boolean; time?: string };
  }) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  firstName: () => string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  me: null,
  status: "idle",
  fetchMe: async () => {
    set({ status: "loading" });
    try {
      const me = await getMe();
      set({ me, status: "ready" });
    } catch (error) {
      handleAuthError(error);
      set({ status: "error" });
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't load your profile. Try again?",
      });
    }
  },
  updateMe: async (input) => {
    const previous = get().me;
    if (previous) {
      set({
        me: {
          ...previous,
          name: input.name ?? previous.name,
          timezone: input.timezone ?? previous.timezone,
          theme: input.theme ?? previous.theme,
          reminder: {
            enabled: input.reminder?.enabled ?? previous.reminder.enabled,
            time: input.reminder?.time ?? previous.reminder.time,
          },
        },
      });
    }
    try {
      const me = await patchMe(input);
      set({ me, status: "ready" });
      return true;
    } catch (error) {
      handleAuthError(error);
      if (previous) {
        set({ me: previous });
      }
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't save that. Tap to try again.",
      });
      return false;
    }
  },
  deleteAccount: async () => {
    try {
      await deleteMe("DELETE");
      set({ me: null, status: "idle" });
      return true;
    } catch (error) {
      handleAuthError(error);
      useAlertStore.getState().addAlert({
        kind: "error",
        message: "Couldn't delete your account. Try again?",
      });
      return false;
    }
  },
  firstName: () => {
    const name = get().me?.name ?? "";
    return name.trim().split(/\s+/)[0] ?? "";
  },
}));
