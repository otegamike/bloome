"use client";

import { useRouter } from "next/navigation";

import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import { Check } from "@/components/icons/Check";
import { Moon } from "@/components/icons/Moon";
import { Button } from "@/components/ui/button/Button";
import { Chip } from "@/components/ui/chip/Chip";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./TodayCard.module.css";

function greeting(firstName: string, hour: number): string {
  if (hour >= 5 && hour <= 11) {
    return firstName ? `Good morning, ${firstName}` : "Good morning";
  }
  if (hour >= 12 && hour <= 16) {
    return "Good afternoon";
  }
  if (hour >= 17 && hour <= 21) {
    return "Good evening";
  }
  return "Good night";
}

function prettyDate(today: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    }).format(new Date(`${today}T00:00:00Z`));
  } catch {
    return today;
  }
}

function prettyTime(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso)).toLowerCase();
  } catch {
    return "";
  }
}

function currentHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).formatToParts(new Date());
    return Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  } catch {
    return 12;
  }
}

export function TodayCard() {
  const router = useRouter();
  const today = useCalendarStore((s) => s.today);
  const timezone = useCalendarStore((s) => s.timezone);
  const getDay = useCalendarStore((s) => s.getDay);
  const markDay = useCalendarStore((s) => s.markDay);
  const removeLog = useCalendarStore((s) => s.removeLog);
  const currentPack = usePackStore((s) => s.currentPack)();
  const packsStatus = usePackStore((s) => s.status);
  const firstName = useProfileStore((s) => s.firstName)();

  if (!today || packsStatus === "loading") {
    return (
      <section aria-label="Today" className={styles.card}>
        <Skeleton variant="title" />
        <Skeleton variant="text" />
        <Skeleton variant="button" />
      </section>
    );
  }

  const tz = timezone ?? "UTC";
  const day = getDay(today);
  const cycleLength = currentPack ? currentPack.activeDays + currentPack.placeboDays : null;
  const logged = day?.state === "taken" || day?.state === "skipped";
  const done = day?.state === "taken";

  return (
    <section
      aria-label="Today"
      data-state={day?.state ?? "none"}
      className={styles.card}
    >
      <BloomMark size={160} open={done} className={styles.bloom} />
      <h2 className={styles.greeting}>{greeting(firstName, currentHour(tz))}</h2>
      <p className={styles.date}>{prettyDate(today, tz)}</p>
      {currentPack && day?.dayInPack != null && cycleLength ? (
        <p className={styles.packRow}>
          <Chip>
            {currentPack.name} · Day {day.dayInPack} of {cycleLength}
          </Chip>
        </p>
      ) : null}

      {day?.state === "today" ? (
        <Button
          size="lg"
          iconLeft={<Check size={20} />}
          onClick={() => void markDay(today, "taken")}
          data-breathe="true"
          className={styles.cta}
        >
          Mark today as taken
        </Button>
      ) : null}

      {logged && day?.log ? (
        <div className={styles.done}>
          <p className={styles.doneTitle}>All done for today</p>
          <p className={styles.doneSub}>
            Marked at {prettyTime(day.log.takenAt, tz)}{" "}
            {day.log.loggedLate ? <Chip tone="secondary">Logged late</Chip> : null}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void removeLog(today)}>
            Undo
          </Button>
        </div>
      ) : null}

      {day?.state === "placebo" ? (
        <p className={styles.placebo}>
          <Moon size={20} />
          Placebo day · nothing to take today
        </p>
      ) : null}

      {(day === null || day?.state === "outside") && (
        <div className={styles.noPack}>
          <p>Start a pack to begin tracking</p>
          <Button onClick={() => router.push("/settings?tab=packs")}>Start a pack</Button>
        </div>
      )}
    </section>
  );
}
