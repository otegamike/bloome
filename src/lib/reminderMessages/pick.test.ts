import { describe, expect, it, vi } from "vitest";

// server-only throws outside the Next.js server runtime; stub it for tests.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/reminderMessages/approvedMessages", () => ({
  loadApprovedMessages: async () => [],
}));

import { CURATED_MESSAGES } from "@/lib/reminderMessages/pool";
import { pickMessage } from "@/lib/reminderMessages/pick";

const USER = "user-pick-1";

describe("pickMessage", () => {
  it("is deterministic for the same user and day", async () => {
    const args = { userId: USER, localDay: "2026-10-06", firstName: "Amara" };
    expect(await pickMessage(args)).toBe(await pickMessage(args));
  });

  it("changes on the next day and never repeats within the bank", async () => {
    const first = await pickMessage({ userId: USER, localDay: "2026-10-06" });
    const second = await pickMessage({ userId: USER, localDay: "2026-10-07" });
    expect(second).not.toBe(first);
    const seen = new Set<string>();
    for (let day = 1; day <= CURATED_MESSAGES.length; day += 1) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      seen.add(await pickMessage({ userId: USER, localDay: date, firstName: "Amara" }));
    }
    expect(seen.size).toBe(CURATED_MESSAGES.length);
  });

  it("orders the bank differently for different users", async () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];
    const a = await Promise.all(
      days.map((localDay) => pickMessage({ userId: "user-a", localDay }))
    );
    const b = await Promise.all(
      days.map((localDay) => pickMessage({ userId: "user-b", localDay }))
    );
    expect(a).not.toEqual(b);
  });

  it("drops name templates without a usable name and replaces {name} otherwise", async () => {
    for (let day = 1; day <= 31; day += 1) {
      const localDay = `2026-11-${String(day).padStart(2, "0")}`;
      const anonymous = await pickMessage({ userId: USER, localDay });
      expect(anonymous).not.toContain("{name}");
      const named = await pickMessage({ userId: USER, localDay, firstName: "Amara" });
      expect(named).not.toContain("{name}");
      expect(named).not.toContain("<");
    }
    const hostile = await pickMessage({
      userId: USER,
      localDay: "2026-10-06",
      firstName: "  Mike<script>",
    });
    expect(hostile).not.toContain("<script>");
    expect(hostile).not.toContain("{name}");
  });
});
