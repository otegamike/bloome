import { create } from "zustand";

import { deleteLog, getCalendar, handleAuthError, putLog } from "@/client/apiClient";
import { getDayState } from "@/lib/shared/cycle";
import { compareDays, todayInTz } from "@/lib/shared/dates";
import { useAlertStore } from "@/store/useAlertStore";
import type { CalendarDay } from "@/types/api";
import type { DayString, LogStatus } from "@/types";

type MonthStatus = "idle" | "loading" | "ready" | "error";

interface MonthEntry {
  status: MonthStatus;
  days: CalendarDay[];
}

type JustKind = "marked" | "undone";

interface CalendarState {
  months: Record<string, MonthEntry | undefined>;
  today: DayString | null;
  timezone: string | null;
  justChanged: Record<string, { kind: JustKind; at: number } | undefined>;
  pending: Record<string, boolean | undefined>;
  epoch: number;
  fetchMonth: (month: string, opts?: { force?: boolean }) => Promise<void>;
  ensureRange: (fromDay: DayString, toDay: DayString) => Promise<void>;
  prefetchAdjacent: (month: string) => void;
  getDay: (day: DayString) => CalendarDay | null;
  markDay: (day: DayString, status: LogStatus, note?: string) => Promise<void>;
  removeLog: (day: DayString) => Promise<void>;
  invalidateAll: () => void;
  refreshIfDayChanged: () => void;
}

function monthOf(day: DayString): string {
  return day.slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  const out = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return out;
}

function monthsBetween(fromDay: DayString, toDay: DayString): string[] {
  const months: string[] = [];
  let current = monthOf(fromDay);
  const last = monthOf(toDay);
  while (current <= last) {
    months.push(current);
    current = shiftMonth(current, 1);
  }
  return months;
}

function prettyDay(day: DayString, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: timezone,
    }).format(new Date(`${day}T00:00:00Z`));
  } catch {
    return day;
  }
}

const seqByMonth: Record<string, number> = {};
const justTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function setJust(
  set: (fn: (s: CalendarState) => Partial<CalendarState>) => void,
  day: DayString,
  kind: JustKind,
): void {
  set((state) => ({
    justChanged: { ...state.justChanged, [day]: { kind, at: Date.now() } },
  }));
  if (justTimers[day]) {
    clearTimeout(justTimers[day]);
  }
  justTimers[day] = setTimeout(() => {
    set((state) => {
      if (!state.justChanged[day]) {
        return {};
      }
      const next = { ...state.justChanged };
      delete next[day];
      return { justChanged: next };
    });
  }, 900);
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  months: {},
  today: null,
  timezone: null,
  justChanged: {},
  pending: {},
  epoch: 0,

  fetchMonth: async (month, opts) => {
    const cached = get().months[month];
    if (cached?.status === "ready" && !opts?.force) {
      return;
    }
    if (cached?.status === "loading") {
      return;
    }
    const seq = (seqByMonth[month] ?? 0) + 1;
    seqByMonth[month] = seq;
    set((state) => ({
      months: { ...state.months, [month]: { status: "loading", days: cached?.days ?? [] } },
    }));
    try {
      const response = await getCalendar(month);
      if (seqByMonth[month] !== seq) {
        return;
      }
      set((state) => ({
        months: { ...state.months, [month]: { status: "ready", days: response.days } },
        today: response.today,
        timezone: response.timezone,
      }));
      get().prefetchAdjacent(month);
    } catch (error) {
      handleAuthError(error);
      if (seqByMonth[month] !== seq) {
        return;
      }
      set((state) => ({
        months: { ...state.months, [month]: { status: "error", days: cached?.days ?? [] } },
      }));
    }
  },

  ensureRange: async (fromDay, toDay) => {
    const [from, to] = compareDays(fromDay, toDay) <= 0 ? [fromDay, toDay] : [toDay, fromDay];
    await Promise.all(monthsBetween(from, to).map((m) => get().fetchMonth(m)));
  },

  prefetchAdjacent: (month) => {
    for (const neighbor of [shiftMonth(month, -1), shiftMonth(month, 1)]) {
      if (!get().months[neighbor]) {
        void get().fetchMonth(neighbor);
      }
    }
  },

  getDay: (day) => {
    const entry = get().months[monthOf(day)];
    return entry?.days.find((d) => d.day === day) ?? null;
  },

  markDay: async (day, status, note) => {
    const alerts = useAlertStore.getState();
    const state = get();
    if (state.pending[day]) {
      return;
    }
    const current = state.getDay(day);
    if (!current || !state.today) {
      return;
    }
    if (current.kind !== "active") {
      alerts.addAlert({ kind: "info", message: "That day can't be logged" });
      return;
    }
    if (compareDays(day, state.today) > 0) {
      alerts.addAlert({ kind: "info", message: "That day hasn't arrived yet" });
      return;
    }
    const epoch = state.epoch;
    const snapshot = current;
    const wasLogged = current.state === "taken" || current.state === "skipped";
    const optimistic: CalendarDay = {
      ...current,
      state: status,
      log: {
        status,
        note: note ?? current.log?.note ?? null,
        takenAt: new Date().toISOString(),
        loggedLate: compareDays(day, state.today) < 0,
      },
    };
    set((s) => ({
      months: {
        ...s.months,
        [monthOf(day)]: {
          status: s.months[monthOf(day)]?.status ?? "ready",
          days: (s.months[monthOf(day)]?.days ?? []).map((d) => (d.day === day ? optimistic : d)),
        },
      },
      pending: { ...s.pending, [day]: true },
    }));
    if (!wasLogged) {
      setJust(set, day, "marked");
    }
    try {
      const { day: serverDay } = await putLog(day, { status, note });
      if (get().epoch !== epoch) {
        return;
      }
      set((s) => ({
        months: {
          ...s.months,
          [monthOf(day)]: {
            status: s.months[monthOf(day)]?.status ?? "ready",
            days: (s.months[monthOf(day)]?.days ?? []).map((d) =>
              d.day === day ? serverDay : d,
            ),
          },
        },
        pending: { ...s.pending, [day]: false },
      }));
      const timezone = get().timezone ?? state.timezone ?? "UTC";
      const message = optimistic.log?.loggedLate
        ? `Caught up for ${prettyDay(day, timezone)}`
        : "Marked as taken";
      alerts.addAlert({
        kind: "success",
        message,
        actionLabel: "Undo",
        onAction: () => {
          void get().removeLog(day);
        },
      });
      alerts.announce(
        optimistic.log?.loggedLate
          ? `Caught up for ${prettyDay(day, timezone)}`
          : `Marked ${prettyDay(day, timezone)} as taken`,
      );
    } catch (error) {
      handleAuthError(error);
      if (get().epoch !== epoch) {
        return;
      }
      set((s) => ({
        months: {
          ...s.months,
          [monthOf(day)]: {
            status: s.months[monthOf(day)]?.status ?? "ready",
            days: (s.months[monthOf(day)]?.days ?? []).map((d) =>
              d.day === day ? snapshot : d,
            ),
          },
        },
        pending: { ...s.pending, [day]: false },
        justChanged: (() => {
          const next = { ...s.justChanged };
          delete next[day];
          return next;
        })(),
      }));
      alerts.addAlert({
        kind: "error",
        message: "Couldn't save that. Tap to try again.",
        actionLabel: "Try again",
        onAction: () => {
          void get().markDay(day, status, note);
        },
      });
    }
  },

  removeLog: async (day) => {
    const alerts = useAlertStore.getState();
    const state = get();
    if (state.pending[day]) {
      return;
    }
    const current = state.getDay(day);
    if (!current || !state.today) {
      return;
    }
    const epoch = state.epoch;
    const snapshot = current;
    const optimistic: CalendarDay = {
      ...current,
      state: getDayState({ kind: current.kind, day, today: state.today, log: null }),
      log: null,
    };
    set((s) => ({
      months: {
        ...s.months,
        [monthOf(day)]: {
          status: s.months[monthOf(day)]?.status ?? "ready",
          days: (s.months[monthOf(day)]?.days ?? []).map((d) => (d.day === day ? optimistic : d)),
        },
      },
      pending: { ...s.pending, [day]: true },
    }));
    setJust(set, day, "undone");
    try {
      await deleteLog(day);
      if (get().epoch !== epoch) {
        return;
      }
      set((s) => ({ pending: { ...s.pending, [day]: false } }));
      const timezone = get().timezone ?? state.timezone ?? "UTC";
      alerts.addAlert({ kind: "info", message: "Removed" });
      alerts.announce(`Removed the log for ${prettyDay(day, timezone)}`);
    } catch (error) {
      handleAuthError(error);
      if (get().epoch !== epoch) {
        return;
      }
      set((s) => ({
        months: {
          ...s.months,
          [monthOf(day)]: {
            status: s.months[monthOf(day)]?.status ?? "ready",
            days: (s.months[monthOf(day)]?.days ?? []).map((d) =>
              d.day === day ? snapshot : d,
            ),
          },
        },
        pending: { ...s.pending, [day]: false },
        justChanged: (() => {
          const next = { ...s.justChanged };
          delete next[day];
          return next;
        })(),
      }));
      alerts.addAlert({ kind: "error", message: "Couldn't save that. Tap to try again." });
    }
  },

  invalidateAll: () => {
    const visible = get().today?.slice(0, 7);
    set((state) => ({ months: {}, epoch: state.epoch + 1 }));
    if (visible) {
      void get().fetchMonth(visible, { force: true });
    }
  },

  refreshIfDayChanged: () => {
    const { today, timezone } = get();
    if (!today) {
      return;
    }
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    let fresh: DayString;
    try {
      fresh = todayInTz(tz);
    } catch {
      return;
    }
    if (fresh !== today) {
      get().invalidateAll();
    }
  },
}));
