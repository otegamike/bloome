"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Chip } from "@/components/ui/chip/Chip";
import { Dialog } from "@/components/ui/dialog/Dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs/SegmentedTabs";
import { Drop } from "@/components/icons/Drop";
import { longDateLabel } from "@/client/calendarGrid";
import { useAlertStore } from "@/store/useAlertStore";
import { useCalendarStore } from "@/store/useCalendarStore";
import { usePackStore } from "@/store/usePackStore";
import { useCalendarDay } from "@/hooks/useCalendarDay";
import type { DayString, LogStatus } from "@/types";
import styles from "./DaySheet.module.css";

function formatTime(iso: string, timezone: string): string {
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

export function DaySheet({ day, onClose }: { day: DayString | null; onClose: () => void }) {
  const titleId = useId();
  const calendarDay = useCalendarDay(day);
  const timezone = useCalendarStore((s) => s.timezone);
  const today = useCalendarStore((s) => s.today);
  const markDay = useCalendarStore((s) => s.markDay);
  const removeLog = useCalendarStore((s) => s.removeLog);
  const markPeriod = useCalendarStore((s) => s.markPeriod);
  const markPeriodDay = useCalendarStore((s) => s.markPeriodDay);
  const removePeriod = useCalendarStore((s) => s.removePeriod);
  const packs = usePackStore((s) => s.packs);
  const [note, setNote] = useState<string | null>(null);
  const [lastDay, setLastDay] = useState<DayString | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Sync the note draft when a different day opens (never in an effect).
  if (day !== lastDay) {
    setLastDay(day);
    setNote(calendarDay?.log?.note ?? "");
  }
  const draft = day === lastDay ? (note ?? "") : "";

  if (!day) {
    return null;
  }

  const tz = timezone ?? "UTC";
  const logged = calendarDay?.log != null;
  const loggable =
    (calendarDay?.kind === "active" || calendarDay?.kind === "placebo") &&
    !!today &&
    calendarDay.day <= today;
  const status: LogStatus = calendarDay?.log?.status ?? "taken";
  const anchorPack = calendarDay?.packId
    ? (packs.find((p) => p.id === calendarDay.packId) ?? null)
    : null;
  const placeboIndex =
    anchorPack && calendarDay?.kind === "placebo" && calendarDay.dayInPack != null
      ? calendarDay.dayInPack - anchorPack.activeDays
      : null;
  const canStartPeriod =
    calendarDay?.isPeriod !== true &&
    (placeboIndex === 3 || placeboIndex === 4) &&
    !!today &&
    day <= today;
  const canMarkPeriodDay =
    calendarDay?.kind === "placebo" &&
    calendarDay.isPeriod !== true &&
    !canStartPeriod &&
    !!today &&
    day <= today;

  const close = () => {
    setNote(null);
    setLastDay(null);
    onClose();
  };

  const mark = (next: LogStatus, noteText?: string) => {
    const wasLogged = logged;
    void markDay(day, next, noteText).then(() => {
      if (!wasLogged) {
        close();
      }
    });
  };

  const saveNote = async () => {
    if (!calendarDay?.log) {
      return;
    }
    setSavingNote(true);
    await markDay(day, calendarDay.log.status, draft);
    setSavingNote(false);
    useAlertStore.getState().addAlert({ kind: "success", message: "Saved" });
  };

  return (
    <Dialog open={day !== null} onClose={close} labelledBy={titleId}>
      <h2 id={titleId} className={styles.title}>
        {longDateLabel(day)}
      </h2>
      {calendarDay ? (
        <p className={styles.packLine}>
          {calendarDay.packName ?? "No pack"} ·{" "}
          {calendarDay.dayInPack ? `Day ${calendarDay.dayInPack}` : ""}
        </p>
      ) : null}
      <div className={styles.chips}>
        {calendarDay ? <Chip tone={chipTone(calendarDay.state)}>{chipLabel(calendarDay.state)}</Chip> : null}
        {calendarDay?.log?.loggedLate ? <Chip tone="secondary">Logged late</Chip> : null}
      </div>
      {calendarDay?.log ? (
        <p className={styles.meta}>Marked at {formatTime(calendarDay.log.takenAt, tz)}</p>
      ) : null}

      {loggable && !logged ? (
        <div className={styles.actions}>
          <Button onClick={() => mark("taken", draft || undefined)}>Mark as taken</Button>
          {calendarDay?.kind !== "placebo" ? (
            <Button variant="secondary" onClick={() => mark("skipped", draft || undefined)}>
              Mark as skipped
            </Button>
          ) : null}
          <textarea
            aria-label="Note (optional)"
            placeholder="Note (optional)"
            maxLength={200}
            value={draft}
            onChange={(e) => setNote(e.target.value)}
            className={styles.note}
          />
          <p className={styles.counter}>{draft.length}/200</p>
        </div>
      ) : null}

      {canStartPeriod ? (
        <div className={styles.period}>
          <p className={styles.periodNote}>Your period may start today.</p>
          <Button variant="secondary" onClick={() => void markPeriod(day).then(close)}>
            Mark period start
          </Button>
        </div>
      ) : null}

      {canMarkPeriodDay ? (
        <div className={styles.period}>
          <Button variant="secondary" onClick={() => void markPeriodDay(day).then(close)}>
            Mark as period day
          </Button>
        </div>
      ) : null}

      {calendarDay?.isPeriod ? (
        <div className={styles.period}>
          <p className={styles.periodLabel}>
            <Drop size={16} />
            Period day
          </p>
          <Button variant="ghost" size="sm" onClick={() => void removePeriod(day)}>
            Remove period day
          </Button>
        </div>
      ) : null}

      {logged && calendarDay?.log ? (
        <div className={styles.actions}>
          {calendarDay?.kind === "placebo" ? (
            status === "taken" ? null : (
              <Button variant="secondary" onClick={() => mark("taken")}>
                Mark as taken
              </Button>
            )
          ) : (
            <SegmentedTabs
              label="Status"
              active={status}
              onChange={(value) => mark(value as LogStatus)}
              options={[
                { value: "taken", label: "Taken" },
                { value: "skipped", label: "Skipped" },
              ]}
            />
          )}
          <textarea
            aria-label="Note"
            maxLength={200}
            value={draft}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (draft !== (calendarDay.log?.note ?? "")) {
                void saveNote();
              }
            }}
            className={styles.note}
          />
          <p className={styles.counter}>{draft.length}/200</p>
          <Button variant="secondary" loading={savingNote} onClick={() => void saveNote()}>
            Save note
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void removeLog(day).then(close);
            }}
          >
            Remove log
          </Button>
        </div>
      ) : null}

      {calendarDay?.state === "placebo" ? (
        <p className={styles.info}>Placebo day 🌙</p>
      ) : null}
      {calendarDay?.state === "upcoming" ? (
        <p className={styles.info}>That day hasn&apos;t arrived yet</p>
      ) : null}
    </Dialog>
  );
}

function chipTone(state: string): "taken" | "missed" | "placebo" | "skipped" | "secondary" | "default" {
  switch (state) {
    case "taken":
    case "placeboTaken":
      return "taken";
    case "missed":
      return "missed";
    case "placebo":
      return "placebo";
    case "skipped":
    case "placeboSkipped":
      return "skipped";
    default:
      return "default";
  }
}

function chipLabel(state: string): string {
  switch (state) {
    case "taken":
      return "Taken";
    case "placeboTaken":
      return "Placebo · taken";
    case "missed":
      return "Missed";
    case "placebo":
      return "Placebo";
    case "skipped":
      return "Skipped";
    case "placeboSkipped":
      return "Placebo · skipped";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    default:
      return state;
  }
}
