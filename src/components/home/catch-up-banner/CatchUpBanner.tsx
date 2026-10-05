"use client";

import { Button } from "@/components/ui/button/Button";
import { addDays } from "@/lib/shared/dates";
import { useCalendarStore } from "@/store/useCalendarStore";
import { useSheetStore } from "@/store/useSheetStore";
import type { CalendarDay } from "@/types/api";
import styles from "./CatchUpBanner.module.css";

export function CatchUpBanner() {
  const months = useCalendarStore((s) => s.months);
  const today = useCalendarStore((s) => s.today);
  const openSheet = useSheetStore((s) => s.open);

  if (!today) {
    return null;
  }
  const weekAgo = addDays(today, -7);
  const missed: CalendarDay[] = [];
  for (const entry of Object.values(months)) {
    for (const day of entry?.days ?? []) {
      if (day.state === "missed" && day.day >= weekAgo && day.day < today) {
        missed.push(day);
      }
    }
  }
  if (missed.length === 0) {
    return null;
  }
  missed.sort((a, b) => (a.day < b.day ? 1 : -1));
  const latest = missed[0];
  if (!latest) {
    return null;
  }
  const text =
    missed.length === 1 ? "Yesterday isn't logged yet" : `${missed.length} recent days aren't logged yet`;

  return (
    <div role="status" className={styles.banner}>
      <span aria-hidden="true" className={styles.ring} />
      <p className={styles.text}>{text}</p>
      <Button size="sm" variant="ghost" onClick={() => openSheet(latest.day)}>
        Catch up
      </Button>
    </div>
  );
}
