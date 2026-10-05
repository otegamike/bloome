import { create } from "zustand";

export interface Alert {
  id: string;
  kind: "success" | "info" | "error";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AlertState {
  alerts: Alert[];
  announcement: string;
  addAlert: (alert: Omit<Alert, "id">) => void;
  dismiss: (id: string) => void;
  announce: (message: string) => void;
}

let nextId = 1;

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  announcement: "",
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, { ...alert, id: `alert-${nextId++}` }],
      announcement: alert.message,
    })),
  dismiss: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
  announce: (message) => set({ announcement: message }),
}));
