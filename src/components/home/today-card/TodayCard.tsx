"use client";

import { useRouter } from "next/navigation";

import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import { Check } from "@/components/icons/Check";
import { Drop } from "@/components/icons/Drop";
import { Moon } from "@/components/icons/Moon";
import { Plus } from "@/components/icons/Plus";
import { Button } from "@/components/ui/button/Button";
import { Chip } from "@/components/ui/chip/Chip";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { addDays } from "@/lib/shared/dates";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useCalendarDay } from "@/hooks/useCalendarDay";
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
  const markDay = useCalendarStore((s) => s.markDay);
  const removeLog = useCalendarStore((s) => s.removeLog);
  const markPeriod = useCalendarStore((s) => s.markPeriod);
  const removePeriod = useCalendarStore((s) => s.removePeriod);
  const day = useCalendarDay(today);
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
  const cycleLength = currentPack ? currentPack.activeDays + currentPack.placeboDays : null;
  const logged = day?.log != null;
  const done = day?.state === "taken" || day?.state === "placeboTaken";
  const daysLeft =
    cycleLength != null && day?.dayInPack != null ? cycleLength - day.dayInPack : null;
  const nextPackStart =
    day?.kind === "placebo" && daysLeft != null && daysLeft <= 1
      ? addDays(today, daysLeft + 1)
      : null;
  const placeboIndex =
    currentPack && day?.kind === "placebo" && day.dayInPack != null
      ? day.dayInPack - currentPack.activeDays
      : null;
  const canStartPeriod =
    day?.isPeriod !== true && (placeboIndex === 3 || placeboIndex === 4);

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
        <div className={styles.placebo}>
          <p className={styles.placeboTitle}>
            <Moon size={20} />
            Placebo day
          </p>
          <p className={styles.placeboSub}>Rest day. Mark it if you took one.</p>
          {canStartPeriod ? (
            <p className={styles.periodNote}>Your period may start today.</p>
          ) : null}
          <div className={styles.placeboActions}>
            <Button onClick={() => void markDay(today, "taken")}>Mark as taken</Button>
            {canStartPeriod ? (
              <Button variant="secondary" onClick={() => void markPeriod(today)}>
                Mark period start
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {day?.isPeriod ? (
        <div className={styles.period}>
          <p className={styles.periodTitle}>
            <Drop size={18} />
            Period day
          </p>
          <Button variant="ghost" size="sm" onClick={() => void removePeriod(today)}>
            Remove period day
          </Button>
        </div>
      ) : null}

      {nextPackStart ? (
        <Button
          size="lg"
          iconLeft={<Plus size={20} />}
          onClick={() => router.push(`/settings?tab=packs&new=1&start=${nextPackStart}`)}
          data-breathe="true"
          className={styles.cta}
        >
          Start a new pack
        </Button>
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
