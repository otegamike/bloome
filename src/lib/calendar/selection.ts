import "server-only";

import { badRequest } from "@/lib/apiErrors";
import { monthsInRange } from "@/lib/shared/dates";
import type { CalendarQuery } from "@/lib/shared/schemas";

export type CalendarSelection = { month: string } | { months: string[] };

export function selectCalendar(query: CalendarQuery): CalendarSelection {
  if (query.month) return { month: query.month };
  if (query.from && query.to) return { months: monthsInRange(query.from, query.to) };
  throw badRequest("Provide month, or from and to");
}
