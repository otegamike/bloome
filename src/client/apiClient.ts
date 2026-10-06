import { isMockMode } from "@/client/mockMode";
import {
  MockApiError,
  mockCreatePack,
  mockCreateShortcutToken,
  mockDeleteLog,
  mockDeleteMe,
  mockDeletePack,
  mockGetCalendar,
  mockGetMe,
  mockListPacks,
  mockListShortcutTokens,
  mockPatchMe,
  mockPutLog,
  mockRegister,
  mockRevokeShortcutToken,
  mockSendTestPush,
  mockSubscribePush,
  mockUnsubscribePush,
  mockUpdatePack,
} from "@/client/mocks/mockApi";
import type {
  ApiErrorBody,
  CalendarDay,
  CalendarResponse,
  MeResponse,
  PackDTO,
  ShortcutTokenDTO,
} from "@/types/api";
import type { LogStatus, ThemeName } from "@/types";

export class ApiClientError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function toClientError(status: number, body: unknown): ApiClientError {
  if (body && typeof body === "object") {
    const record = body as Partial<ApiErrorBody>;
    if (typeof record.error === "string" && record.error) {
      const fields = record.fields && typeof record.fields === "object" ? record.fields : undefined;
      return new ApiClientError(status, record.error, fields);
    }
  }
  if (status === 0) {
    return new ApiClientError(0, "You're offline. We'll try again when you're back.");
  }
  return new ApiClientError(status, "Something went wrong");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiClientError(0, "You're offline. We'll try again when you're back.");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw toClientError(response.status, body);
  }
  return body as T;
}

async function mock<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof MockApiError) {
      throw new ApiClientError(error.status, error.message, error.fields);
    }
    throw error;
  }
}

export function handleAuthError(error: unknown): void {
  if (isMockMode() || typeof window === "undefined") {
    return;
  }
  if (error instanceof ApiClientError && error.status === 401) {
    // A full reload is intentional: the session changed under us.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }
}
export async function register(input: {
  name: string;
  email: string;
  password: string;
  timezone: string;
}): Promise<{ ok: true }> {
  if (isMockMode()) {
    return mock(() => mockRegister(input));
  }
  return request<{ ok: true }>("/api/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMe(): Promise<MeResponse> {
  if (isMockMode()) {
    return mock(() => mockGetMe());
  }
  return request<MeResponse>("/api/me");
}

export async function patchMe(input: {
  name?: string;
  timezone?: string;
  theme?: ThemeName;
  reminder?: { enabled?: boolean; time?: string; onPlaceboDays?: boolean };
}): Promise<MeResponse> {
  if (isMockMode()) {
    return mock(() => mockPatchMe(input));
  }
  return request<MeResponse>("/api/me", { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteMe(confirm: "DELETE"): Promise<void> {
  if (isMockMode()) {
    return mock(() => mockDeleteMe(confirm));
  }
  return request<void>("/api/me", { method: "DELETE", body: JSON.stringify({ confirm }) });
}

export async function listPacks(): Promise<{ packs: PackDTO[] }> {
  if (isMockMode()) {
    return mock(() => mockListPacks());
  }
  return request<{ packs: PackDTO[] }>("/api/packs");
}

export async function createPack(input: {
  name: string;
  activeDays: number;
  placeboDays: number;
  startDay: string;
}): Promise<{ pack: PackDTO }> {
  if (isMockMode()) {
    return mock(() => mockCreatePack(input));
  }
  return request<{ pack: PackDTO }>("/api/packs", { method: "POST", body: JSON.stringify(input) });
}

export async function updatePack(
  id: string,
  input: { name?: string; activeDays?: number; placeboDays?: number; startDay?: string }
): Promise<{ pack: PackDTO }> {
  if (isMockMode()) {
    return mock(() => mockUpdatePack(id, input));
  }
  return request<{ pack: PackDTO }>(`/api/packs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePack(id: string): Promise<void> {
  if (isMockMode()) {
    return mock(() => mockDeletePack(id));
  }
  return request<void>(`/api/packs/${id}`, { method: "DELETE" });
}

export async function getCalendar(month: string): Promise<CalendarResponse> {
  if (isMockMode()) {
    return mock(() => mockGetCalendar(month));
  }
  return request<CalendarResponse>(`/api/calendar?month=${encodeURIComponent(month)}`);
}

export async function putLog(
  day: string,
  input: { status: LogStatus; note?: string }
): Promise<{ day: CalendarDay }> {
  if (isMockMode()) {
    return mock(() => mockPutLog(day, input));
  }
  return request<{ day: CalendarDay }>(`/api/logs/${day}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteLog(day: string): Promise<void> {
  if (isMockMode()) {
    return mock(() => mockDeleteLog(day));
  }
  return request<void>(`/api/logs/${day}`, { method: "DELETE" });
}

export async function subscribePush(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: true }> {
  if (isMockMode()) {
    return mock(() => mockSubscribePush(input));
  }
  return request<{ ok: true }>("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  if (isMockMode()) {
    return mock(() => mockUnsubscribePush(endpoint));
  }
  return request<void>("/api/push/subscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendTestPush(): Promise<{ sent: number }> {
  if (isMockMode()) {
    return mock(() => mockSendTestPush());
  }
  return request<{ sent: number }>("/api/push/test", { method: "POST", body: "{}" });
}

export async function listShortcutTokens(): Promise<{ tokens: ShortcutTokenDTO[] }> {
  if (isMockMode()) {
    return mock(() => mockListShortcutTokens());
  }
  return request<{ tokens: ShortcutTokenDTO[] }>("/api/shortcuts/tokens");
}

export async function createShortcutToken(input: {
  label: string;
  expiresInDays: 30 | 90 | 365 | null;
}): Promise<{ token: ShortcutTokenDTO; secret: string }> {
  if (isMockMode()) {
    return mock(() => mockCreateShortcutToken(input));
  }
  return request<{ token: ShortcutTokenDTO; secret: string }>("/api/shortcuts/tokens", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function revokeShortcutToken(id: string): Promise<void> {
  if (isMockMode()) {
    return mock(() => mockRevokeShortcutToken(id));
  }
  return request<void>(`/api/shortcuts/tokens/${id}`, { method: "DELETE" });
}
