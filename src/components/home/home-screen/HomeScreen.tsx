"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell/AppShell";
import { CalendarBoard } from "@/components/calendar/calendar-board/CalendarBoard";
import { Legend } from "@/components/calendar/legend/Legend";
import { CatchUpBanner } from "@/components/home/catch-up-banner/CatchUpBanner";
import { PackStrip } from "@/components/home/pack-strip/PackStrip";
import { PullRefresh } from "@/components/home/pull-refresh/PullRefresh";
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

  // Day rollover + stale-data refresh. Midnight and day changes use
  // refreshIfDayChanged; returning after a long time away (same day, old
  // data) does a throttled soft refetch of the visible month and packs.
  useEffect(() => {
    const SOFT_REFRESH_MS = 5 * 60 * 1000;
    const hiddenAtRef = { current: null as number | null };
    const lastSoftRef = { current: Date.now() };
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timer = window.setTimeout(() => refreshIfDayChanged(), msToNextMidnight(tz));

    const softRefresh = (force: boolean) => {
      if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastSoftRef.current < SOFT_REFRESH_MS) {
        return;
      }
      lastSoftRef.current = now;
      const state = useCalendarStore.getState();
      const zone = state.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const visible = state.today?.slice(0, 7) ?? currentMonthInTz(zone);
      state.refreshVisible([visible]);
      void usePackStore.getState().fetchPacks();
    };

    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      useCalendarStore.getState().refreshIfDayChanged();
      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (hiddenFor >= SOFT_REFRESH_MS) {
        softRefresh(true);
      }
    };
    const onFocus = () => {
      useCalendarStore.getState().refreshIfDayChanged();
      softRefresh(false);
    };
    const onOnline = () => {
      softRefresh(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [timezone, refreshIfDayChanged]);

  useEffect(() => {
    if (packsStatus === "ready" && packs.length === 0) {
      router.replace("/onboarding");
    }
  }, [packsStatus, packs.length, router]);

  const loading = meStatus === "loading" || packsStatus === "loading";

  const handlePullRefresh = async () => {
    const state = useCalendarStore.getState();
    const zone = state.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const visible = state.today?.slice(0, 7) ?? currentMonthInTz(zone);
    await Promise.allSettled([
      state.fetchMonth(visible, { force: true }),
      usePackStore.getState().fetchPacks(),
    ]);
  };

  return (
    <AppShell>
      <div className={styles.home}>
        <TimezoneBanner />
        <CatchUpBanner />
        <PullRefresh onRefresh={handlePullRefresh}>
          {loading ? (
            <div className={styles.loading}>
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : (
            <div className={styles.columns}>
              <div className={styles.left}>
                <TodayCard />
                <Legend />
              </div>
              <div className={styles.right}>
                <CalendarBoard />
                <PackStrip />
              </div>
            </div>
          )}
        </PullRefresh>
      </div>
    </AppShell>
  );
}
