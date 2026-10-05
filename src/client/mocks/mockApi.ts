import { buildDays, getDayKind, resolveAnchor } from "@/lib/shared/cycle";
import {
  addDays,
  compareDays,
  isValidDay,
  isValidMonth,
  isValidTimezone,
  monthDays,
  todayInTz,
} from "@/lib/shared/dates";
import { loadMockState, saveMockState, type MockState } from "@/client/mocks/mockDb";
import { consumeMockLogFailure } from "@/client/mockMode";
import type {
  ApiErrorBody,
  CalendarDay,
  CalendarResponse,
  MeResponse,
  PackDTO,
} from "@/types/api";
import type { DayString, LogStatus, ThemeName } from "@/types";

export class MockApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }

  toBody(): ApiErrorBody {
    return this.fields ? { error: this.message, fields: this.fields } : { error: this.message };
  }
}

function delay(): Promise<void> {
  const ms = 150 + Math.random() * 250;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withState<T>(fn: (state: MockState) => T): T {
  const state = loadMockState();
  const result = fn(state);
  saveMockState(state);
  return result;
}

function packLikes(state: MockState) {
  return state.packs.map((p) => ({
    id: p.id,
    name: p.name,
    startDay: p.startDay,
    activeDays: p.activeDays,
    placeboDays: p.placeboDays,
  }));
}

function buildCalendarDay(state: MockState, day: DayString): CalendarDay {
  const today = todayInTz(state.me.timezone);
  const built = buildDays({
    packs: packLikes(state),
    logs: state.logs,
    days: [day],
    today,
  });
  const first = built[0];
  if (!first) {
    throw new MockApiError(500, "Something went wrong");
  }
  return first;
}

export async function mockRegister(input: {
  name: string;
  email: string;
  password: string;
  timezone: string;
}): Promise<{ ok: true }> {
  await delay();
  if (!input.name.trim() || input.name.trim().length > 60) {
    throw new MockApiError(400, "Name is required", { name: ["Name is required"] });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
    throw new MockApiError(400, "Enter a valid email", { email: ["Enter a valid email"] });
  }
  if (input.password.length < 8) {
    throw new MockApiError(400, "Password must be at least 8 characters", {
      password: ["Password must be at least 8 characters"],
    });
  }
  if (!isValidTimezone(input.timezone)) {
    throw new MockApiError(400, "Choose a valid timezone", { timezone: ["Choose a valid timezone"] });
  }
  return withState((state) => {
    if (input.email.toLowerCase() === state.me.email.toLowerCase()) {
      throw new MockApiError(409, "We couldn't create an account with those details. If you already have one, try signing in.");
    }
    state.me.name = input.name.trim();
    state.me.email = input.email.toLowerCase();
    state.me.timezone = input.timezone;
    return { ok: true as const };
  });
}

export async function mockGetMe(): Promise<MeResponse> {
  await delay();
  return withState((state) => ({
    ...state.me,
    reminder: { ...state.me.reminder },
    pushDeviceCount: state.pushEndpoints.length,
  }));
}

export async function mockPatchMe(input: {
  name?: string;
  timezone?: string;
  theme?: ThemeName;
  reminder?: { enabled?: boolean; time?: string };
}): Promise<MeResponse> {
  await delay();
  return withState((state) => {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name || name.length > 60) {
        throw new MockApiError(400, "Name is required", { name: ["Name is required"] });
      }
      state.me.name = name;
    }
    if (input.timezone !== undefined) {
      if (!isValidTimezone(input.timezone)) {
        throw new MockApiError(400, "Choose a valid timezone", {
          timezone: ["Choose a valid timezone"],
        });
      }
      state.me.timezone = input.timezone;
    }
    if (input.theme !== undefined) {
      if (input.theme !== "blush" && input.theme !== "rose" && input.theme !== "peach") {
        throw new MockApiError(400, "Choose a valid theme", { theme: ["Choose a valid theme"] });
      }
      state.me.theme = input.theme;
    }
    if (input.reminder !== undefined) {
      if (input.reminder.time !== undefined && !/^\d{2}:\d{2}$/.test(input.reminder.time)) {
        throw new MockApiError(400, "Use a valid time", { reminder: ["Use a valid time"] });
      }
      state.me.reminder = {
        enabled: input.reminder.enabled ?? state.me.reminder.enabled,
        time: input.reminder.time ?? state.me.reminder.time,
      };
    }
    return {
      ...state.me,
      reminder: { ...state.me.reminder },
      pushDeviceCount: state.pushEndpoints.length,
    };
  });
}

export async function mockDeleteMe(confirm: string): Promise<void> {
  await delay();
  withState((state) => {
    if (confirm !== "DELETE") {
      throw new MockApiError(400, "Type DELETE to confirm", { confirm: ["Type DELETE to confirm"] });
    }
    const fresh = {
      ...state,
      packs: [],
      logs: {},
      pushEndpoints: [],
    };
    state.packs = fresh.packs;
    state.logs = fresh.logs;
    state.pushEndpoints = fresh.pushEndpoints;
  });
}

export async function mockListPacks(): Promise<{ packs: PackDTO[] }> {
  await delay();
  return withState((state) => ({
    packs: [...state.packs].sort((a, b) => compareDays(b.startDay, a.startDay)),
  }));
}

export async function mockCreatePack(input: {
  name: string;
  activeDays: number;
  placeboDays: number;
  startDay: string;
}): Promise<{ pack: PackDTO }> {
  await delay();
  return withState((state) => {
    const name = input.name.trim();
    if (!name || name.length > 60) {
      throw new MockApiError(400, "Name is required", { name: ["Name is required"] });
    }
    if (!Number.isInteger(input.activeDays) || input.activeDays < 1 || input.activeDays > 120) {
      throw new MockApiError(400, "Active days must be between 1 and 120", {
        activeDays: ["Active days must be between 1 and 120"],
      });
    }
    if (!Number.isInteger(input.placeboDays) || input.placeboDays < 0 || input.placeboDays > 14) {
      throw new MockApiError(400, "Placebo days must be between 0 and 14", {
        placeboDays: ["Placebo days must be between 0 and 14"],
      });
    }
    if (!isValidDay(input.startDay)) {
      throw new MockApiError(400, "Start day must be YYYY-MM-DD", {
        startDay: ["Start day must be YYYY-MM-DD"],
      });
    }
    const today = todayInTz(state.me.timezone);
    if (compareDays(input.startDay, addDays(today, 30)) > 0) {
      throw new MockApiError(400, "Start day is too far ahead", {
        startDay: ["Start day is too far ahead"],
      });
    }
    if (state.packs.some((p) => p.startDay === input.startDay)) {
      throw new MockApiError(409, "A pack already starts on that day");
    }
    for (const p of state.packs) {
      p.isCurrent = false;
    }
    const pack: PackDTO = {
      id: `mock-pack-${state.packSeq++}`,
      name,
      activeDays: input.activeDays,
      placeboDays: input.placeboDays,
      startDay: input.startDay,
      isCurrent: true,
    };
    state.packs.push(pack);
    return { pack };
  });
}

export async function mockUpdatePack(
  id: string,
  input: { name?: string; activeDays?: number; placeboDays?: number; startDay?: string },
): Promise<{ pack: PackDTO }> {
  await delay();
  return withState((state) => {
    const pack = state.packs.find((p) => p.id === id);
    if (!pack) {
      throw new MockApiError(404, "Pack not found");
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name || name.length > 60) {
        throw new MockApiError(400, "Name is required", { name: ["Name is required"] });
      }
      pack.name = name;
    }
    if (input.activeDays !== undefined) {
      if (!Number.isInteger(input.activeDays) || input.activeDays < 1 || input.activeDays > 120) {
        throw new MockApiError(400, "Active days must be between 1 and 120", {
          activeDays: ["Active days must be between 1 and 120"],
        });
      }
      pack.activeDays = input.activeDays;
    }
    if (input.placeboDays !== undefined) {
      if (!Number.isInteger(input.placeboDays) || input.placeboDays < 0 || input.placeboDays > 14) {
        throw new MockApiError(400, "Placebo days must be between 0 and 14", {
          placeboDays: ["Placebo days must be between 0 and 14"],
        });
      }
      pack.placeboDays = input.placeboDays;
    }
    if (input.startDay !== undefined) {
      if (!isValidDay(input.startDay)) {
        throw new MockApiError(400, "Start day must be YYYY-MM-DD", {
          startDay: ["Start day must be YYYY-MM-DD"],
        });
      }
      if (state.packs.some((p) => p.id !== id && p.startDay === input.startDay)) {
        throw new MockApiError(409, "A pack already starts on that day");
      }
      pack.startDay = input.startDay;
    }
    return { pack: { ...pack } };
  });
}

export async function mockDeletePack(id: string): Promise<void> {
  await delay();
  withState((state) => {
    const index = state.packs.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new MockApiError(404, "Pack not found");
    }
    const [removed] = state.packs.splice(index, 1);
    if (removed?.isCurrent && state.packs.length > 0) {
      const latest = [...state.packs].sort((a, b) => compareDays(b.startDay, a.startDay))[0];
      if (latest) {
        latest.isCurrent = true;
      }
    }
  });
}

export async function mockGetCalendar(month: string): Promise<CalendarResponse> {
  await delay();
  return withState((state) => {
    if (!isValidMonth(month)) {
      throw new MockApiError(400, "Month must be YYYY-MM");
    }
    const days = monthDays(month);
    const today = todayInTz(state.me.timezone);
    return {
      month,
      today,
      timezone: state.me.timezone,
      days: buildDays({ packs: packLikes(state), logs: state.logs, days, today }),
    };
  });
}

function assertLoggable(state: MockState, day: DayString): void {
  const today = todayInTz(state.me.timezone);
  if (!isValidDay(day)) {
    throw new MockApiError(400, "Day must be YYYY-MM-DD");
  }
  if (compareDays(day, today) > 0) {
    throw new MockApiError(422, "Cannot log a future day");
  }
  const anchor = resolveAnchor(packLikes(state), day);
  const kind = anchor
    ? getDayKind(anchor.startDay, anchor.activeDays, anchor.placeboDays, day)
    : "outside";
  if (kind === "placebo") {
    throw new MockApiError(422, "Placebo days are rest days and cannot be logged");
  }
  if (kind === "outside") {
    throw new MockApiError(422, "Days before your first pack cannot be logged");
  }
}

export async function mockPutLog(
  day: string,
  input: { status: LogStatus; note?: string },
): Promise<{ day: CalendarDay }> {
  if (consumeMockLogFailure()) {
    await delay();
    throw new MockApiError(500, "Something went wrong");
  }
  await delay();
  return withState((state) => {
    if (input.status !== "taken" && input.status !== "skipped") {
      throw new MockApiError(400, "Status must be taken or skipped", {
        status: ["Status must be taken or skipped"],
      });
    }
    assertLoggable(state, day);
    const note = input.note?.trim() ? input.note.trim().slice(0, 200) : null;
    const today = todayInTz(state.me.timezone);
    state.logs[day] = {
      status: input.status,
      note,
      takenAt: new Date().toISOString(),
      loggedLate: compareDays(day, today) < 0,
    };
    return { day: buildCalendarDay(state, day) };
  });
}

export async function mockDeleteLog(day: string): Promise<void> {
  await delay();
  withState((state) => {
    delete state.logs[day];
  });
}

export async function mockSubscribePush(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: true }> {
  await delay();
  return withState((state) => {
    if (!input.endpoint.startsWith("http")) {
      throw new MockApiError(400, "Subscription looks invalid", {
        endpoint: ["Subscription looks invalid"],
      });
    }
    if (!state.pushEndpoints.includes(input.endpoint)) {
      state.pushEndpoints.push(input.endpoint);
      while (state.pushEndpoints.length > 5) {
        state.pushEndpoints.shift();
      }
    }
    return { ok: true as const };
  });
}

export async function mockUnsubscribePush(endpoint: string): Promise<void> {
  await delay();
  withState((state) => {
    state.pushEndpoints = state.pushEndpoints.filter((e) => e !== endpoint);
  });
}

export async function mockSendTestPush(): Promise<{ sent: number }> {
  await delay();
  return withState((state) => {
    const now = Date.now();
    if (state.pushTestAt && now - state.pushTestAt < 60_000) {
      throw new MockApiError(429, "Give it a minute before sending another test.");
    }
    state.pushTestAt = now;
    return { sent: state.pushEndpoints.length > 0 ? 1 : 0 };
  });
}
