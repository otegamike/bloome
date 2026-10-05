"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell/AppShell";
import { CalendarBoard } from "@/components/calendar/calendar-board/CalendarBoard";
import { Legend } from "@/components/calendar/legend/Legend";
import { CatchUpBanner } from "@/components/home/catch-up-banner/CatchUpBanner";
import { PackStrip } from "@/components/home/pack-strip/PackStrip";
import { TimezoneBanner } from "@/components/home/timezone-banner/TimezoneBanner";
import { TodayCard } from "@/components/home/today-card/TodayCard";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import { currentMonthInTz } from "@/client/calendarGrid";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import { useProfileStore } from "@/store/useProfileStore";
import styles from "./HomeScreen.module.css";

function msToNextMidnight(timezone: string): number {
  try {
    const now = new Date();
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
    const [datePart, timePart] = local.split(", ");
    const [y, m, d] = (datePart ?? "").split("-").map(Number);
    const [hh, mm, ss] = (timePart ?? "").split(" ").map(Number);
    const asUtc = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, ss ?? 0);
    const offset = asUtc - now.getTime();
    const midnightLocal = Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0);
    return Math.max(1000, midnightLocal - offset - now.getTime());
  } catch {
    return 60_000;
  }
}

export function HomeScreen() {
  const router = useRouter();
  const fetchMe = useProfileStore((s) => s.fetchMe);
  const meStatus = useProfileStore((s) => s.status);
  const packs = usePackStore((s) => s.packs);
  const packsStatus = usePackStore((s) => s.status);
  const fetchPacks = usePackStore((s) => s.fetchPacks);
  const fetchMonth = useCalendarStore((s) => s.fetchMonth);
  const refreshIfDayChanged = useCalendarStore((s) => s.refreshIfDayChanged);
  const timezone = useCalendarStore((s) => s.timezone);

  useEffect(() => {
    void fetchMe();
    void fetchPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    void fetchMonth(currentMonthInTz(tz));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  // Day rollover: refresh at the next local midnight, on focus, and when visible.
  useEffect(() => {
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timer = window.setTimeout(() => refreshIfDayChanged(), msToNextMidnight(tz));
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshIfDayChanged();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshIfDayChanged);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshIfDayChanged);
    };
  }, [timezone, refreshIfDayChanged]);

  useEffect(() => {
    if (packsStatus === "ready" && packs.length === 0) {
      router.replace("/onboarding");
    }
  }, [packsStatus, packs.length, router]);

  const loading = meStatus === "loading" || packsStatus === "loading";

  return (
    <AppShell>
      <div className={styles.home}>
        <TimezoneBanner />
        <CatchUpBanner />
        {loading ? (
          <div className={styles.loading}>
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : (
          <div className={styles.columns}>
            <div className={styles.left}>
              <TodayCard />
              <PackStrip />
              <Legend />
            </div>
            <div className={styles.right}>
              <CalendarBoard />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
