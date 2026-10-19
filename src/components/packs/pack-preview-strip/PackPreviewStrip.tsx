import { ArrowDownIcon } from "@/components/icons/ArrowDownIcon";
import { ArrowRightIcon } from "@/components/icons/ArrowRightIcon";
import { Check } from "@/components/icons/Check";
import { addDays } from "@/lib/shared/dates";
import { getDayKind } from "@/lib/shared/cycle";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";
import styles from "./PackPreviewStrip.module.css";

type StripProps =
  | { variant: "preview"; startDay: DayString; activeDays: number; placeboDays: number }
  | { variant: "live"; days: CalendarDay[]; today: DayString | null };

interface Dot {
  key: string;
  dotState: string;
  label: string;
  current: boolean;
}

function previewDots(startDay: DayString, activeDays: number, placeboDays: number): Dot[] {
  const length = activeDays + placeboDays;
  const dots: Dot[] = [];
  for (let i = 0; i < length; i += 1) {
    const day = addDays(startDay, i);
    const kind = getDayKind(startDay, activeDays, placeboDays, day);
    dots.push({
      key: day,
      dotState: kind === "placebo" ? "placebo" : "upcoming",
      label: `Day ${i + 1}, ${kind}`,
      current: false,
    });
  }
  return dots;
}

function liveDots(days: CalendarDay[], today: DayString | null): Dot[] {
  return days.map((d, index) => {
    const position = d.dayInPack ?? index + 1;
    let label: string;
    switch (d.state) {
      case "taken":
        label = `Day ${position}, taken`;
        break;
      case "missed":
        label = `Day ${position}, missed`;
        break;
      case "skipped":
        label = `Day ${position}, skipped`;
        break;
      case "placebo":
        label = `Day ${position}, placebo`;
        break;
      case "placeboTaken":
        label = `Day ${position}, placebo, taken`;
        break;
      case "placeboSkipped":
        label = `Day ${position}, placebo, skipped`;
        break;
      case "today":
        label = `Day ${position}, today`;
        break;
      case "upcoming":
        label = `Day ${position}, upcoming`;
        break;
      default:
        label = `Day ${position}, ${d.state}`;
    }
    return { key: d.day, dotState: d.state, label, current: d.day === today };
  });
}

export function PackPreviewStrip(props: StripProps) {
  const dots = props.variant === "preview"
    ? previewDots(props.startDay, props.activeDays, props.placeboDays)
    : liveDots(props.days, props.today);
  const rows = chunkIntoRows(dots);
  return (
    <div role="list" aria-label="Pack days" className={styles.strip}>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          role="presentation"
          className={styles.row}
          data-direction={rowIndex % 2 === 0 ? "ltr" : "rtl"}
        >
          {row.map((dot, colIndex) => (
            <StripSlot
              key={dot.key}
              dot={dot}
              hasNext={colIndex < row.length - 1}
              turnsDown={colIndex === row.length - 1 && rowIndex < rows.length - 1}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const DOTS_PER_ROW = 7;

function chunkIntoRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += DOTS_PER_ROW) {
    rows.push(items.slice(i, i + DOTS_PER_ROW));
  }
  return rows;
}

interface StripSlotProps {
  dot: Dot;
  hasNext: boolean;
  turnsDown: boolean;
}

function StripSlot({ dot, hasNext, turnsDown }: StripSlotProps) {
  return (
    <div role="listitem" aria-label={dot.label} className={styles.slot}>
      <span
        data-state={dot.dotState}
        data-current={dot.current ? "true" : undefined}
        aria-hidden="true"
        className={styles.dot}
      >
        {dot.dotState === "taken" || dot.dotState === "placeboTaken" ? <Check size={10} /> : null}
      </span>
      {hasNext ? (
        <span aria-hidden="true" className={styles.arrowNext}>
          <ArrowRightIcon size={10} />
        </span>
      ) : null}
      {turnsDown ? (
        <span aria-hidden="true" className={styles.arrowDown}>
          <ArrowDownIcon size={10} />
        </span>
      ) : null}
    </div>
  );
}
