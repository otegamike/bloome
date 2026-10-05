import type { CalendarDayLog, MeResponse, PackDTO } from "@/types/api";
import { addDays, todayInTz } from "@/lib/shared/dates";

export interface MockState {
  me: MeResponse;
  packs: PackDTO[];
  logs: Record<string, CalendarDayLog | undefined>;
  pushEndpoints: string[];
  pushTestAt: number | null;
  packSeq: number;
}

const STORAGE_KEY = "bloome.mockState.v1";

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function seed(): MockState {
  const timezone = browserTimezone();
  const today = todayInTz(timezone);
  const startDay = addDays(today, -12);
  const pack: PackDTO = {
    id: "mock-pack-1",
    name: "Levofem",
    activeDays: 21,
    placeboDays: 7,
    startDay,
    isCurrent: true,
  };
  const logs: Record<string, CalendarDayLog | undefined> = {};
  const taken = (day: string, note: string | null = null): void => {
    logs[day] = {
      status: "taken",
      note,
      takenAt: new Date(`${day}T08:15:00Z`).toISOString(),
      loggedLate: false,
    };
  };
  // A few logs with one deliberate gap (3 days ago stays unlogged = missed).
  taken(addDays(today, -11));
  taken(addDays(today, -10));
  taken(addDays(today, -9), "With breakfast");
  taken(addDays(today, -8));
  taken(addDays(today, -7));
  taken(addDays(today, -6));
  taken(addDays(today, -5));
  taken(addDays(today, -4));
  // gap at -3
  taken(addDays(today, -2));
  taken(addDays(today, -1));
  return {
    me: {
      id: "mock-user-1",
      name: "Rose",
      email: "rose@example.com",
      image: null,
      providers: ["credentials"],
      timezone,
      theme: "blush",
      reminder: { enabled: false, time: "20:00" },
      pushDeviceCount: 0,
    },
    packs: [pack],
    logs,
    pushEndpoints: [],
    pushTestAt: null,
    packSeq: 2,
  };
}

export function loadMockState(): MockState {
  if (typeof window === "undefined") {
    return seed();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockState;
      if (parsed.me && Array.isArray(parsed.packs) && parsed.logs) {
        return parsed;
      }
    }
  } catch {
    // Fall through to a fresh seed.
  }
  const fresh = seed();
  saveMockState(fresh);
  return fresh;
}

export function saveMockState(state: MockState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; the in-memory copy still works.
  }
}
