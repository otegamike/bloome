// True when the app runs against the in-memory mock instead of the real API.
// Set NEXT_PUBLIC_USE_MOCKS=true in .env.local for frontend-only development.

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}

const MOCK_FLAG_KEY = "bloome.mockSignedIn";

export function isMockSignedIn(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(MOCK_FLAG_KEY) === "1";
}

export function setMockSignedIn(signedIn: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (signedIn) {
    window.localStorage.setItem(MOCK_FLAG_KEY, "1");
  } else {
    window.localStorage.removeItem(MOCK_FLAG_KEY);
  }
}

/** Appending ?mockFail=log to any URL makes the next PUT /api/logs/* call fail. */
export function consumeMockLogFailure(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("mockFail") !== "log") {
    return false;
  }
  params.delete("mockFail");
  const rest = params.toString();
  const url = `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
  return true;
}
