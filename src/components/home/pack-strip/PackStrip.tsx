"use client";

import { useEffect } from "react";

import { PackPreviewStrip } from "@/components/packs/pack-preview-strip/PackPreviewStrip";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { addDays } from "@/lib/shared/dates";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import type { CalendarDay } from "@/types/api";
import styles from "./PackStrip.module.css";

function formatStarted(startDay: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${startDay}T00:00:00Z`));
  } catch {
    return startDay;
  }
}

export function PackStrip() {
  const today = useCalendarStore((s) => s.today);
  const getDay = useCalendarStore((s) => s.getDay);
  const ensureRange = useCalendarStore((s) => s.ensureRange);
  const currentPack = usePackStore((s) => s.currentPack)();

  const todayDay = today ? getDay(today) : null;
  const cycleLength = currentPack ? currentPack.activeDays + currentPack.placeboDays : 0;
  const cycleStart =
    today && todayDay?.dayInPack ? addDays(today, -(todayDay.dayInPack - 1)) : null;
  const cycleEnd = cycleStart && cycleLength ? addDays(cycleStart, cycleLength - 1) : null;

  useEffect(() => {
    if (cycleStart && cycleEnd) {
      void ensureRange(cycleStart, cycleEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleStart, cycleEnd]);

  if (!today || !currentPack) {
    return null;
  }

  if (!todayDay?.dayInPack || !cycleStart || !cycleEnd) {
    return (
      <section aria-label="Current pack" className={styles.card}>
        <Skeleton variant="text" />
        <Skeleton variant="chip" />
      </section>
    );
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < cycleLength; i += 1) {
    const found = getDay(addDays(cycleStart, i));
    if (found) {
      days.push(found);
    }
  }
  const loaded = days.length === cycleLength;
  const left = cycleLength - todayDay.dayInPack;

  return (
    <section aria-label="Current pack" className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.name}>{currentPack.name}</h2>
        <p className={styles.started}>Started {formatStarted(currentPack.startDay)}</p>
      </div>
      {loaded ? (
        <PackPreviewStrip variant="live" days={days} />
      ) : (
        <div className={styles.loading}>
          <Skeleton variant="chip" />
        </div>
      )}
      <p className={styles.footer}>
        Day {todayDay.dayInPack} of {cycleLength} · {left} {left === 1 ? "day" : "days"} left in
        this pack
      </p>
    </section>
  );
}
