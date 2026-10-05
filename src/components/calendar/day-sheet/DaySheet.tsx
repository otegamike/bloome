"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Chip } from "@/components/ui/chip/Chip";
import { Dialog } from "@/components/ui/dialog/Dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs/SegmentedTabs";
import { longDateLabel } from "@/client/calendarGrid";
import { useAlertStore } from "@/store/useAlertStore";
import { useCalendarStore } from "@/store/useCalendarStore";
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
  const calendarDay = useCalendarStore((s) => (day ? s.getDay(day) : null));
  const timezone = useCalendarStore((s) => s.timezone);
  const today = useCalendarStore((s) => s.today);
  const markDay = useCalendarStore((s) => s.markDay);
  const removeLog = useCalendarStore((s) => s.removeLog);
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
    calendarDay?.kind === "active" && !!today && calendarDay.day <= today;
  const status: LogStatus = calendarDay?.log?.status ?? "taken";

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
          <Button variant="secondary" onClick={() => mark("skipped", draft || undefined)}>
            Mark as skipped
          </Button>
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

      {logged && calendarDay?.log ? (
        <div className={styles.actions}>
          <SegmentedTabs
            label="Status"
            active={status}
            onChange={(value) => mark(value as LogStatus)}
            options={[
              { value: "taken", label: "Taken" },
              { value: "skipped", label: "Skipped" },
            ]}
          />
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
        <p className={styles.info}>Placebo day · nothing to take today</p>
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
      return "taken";
    case "missed":
      return "missed";
    case "placebo":
      return "placebo";
    case "skipped":
      return "skipped";
    default:
      return "default";
  }
}

function chipLabel(state: string): string {
  switch (state) {
    case "taken":
      return "Taken";
    case "missed":
      return "Missed";
    case "placebo":
      return "Placebo";
    case "skipped":
      return "Skipped";
    case "today":
      return "Today";
    case "upcoming":
      return "Upcoming";
    default:
      return state;
  }
}
