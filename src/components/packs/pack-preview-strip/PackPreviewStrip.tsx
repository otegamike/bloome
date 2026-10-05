import { Check } from "@/components/icons/Check";
import { addDays } from "@/lib/shared/dates";
import { getDayKind } from "@/lib/shared/cycle";
import type { CalendarDay } from "@/types/api";
import type { DayString } from "@/types";
import styles from "./PackPreviewStrip.module.css";

type StripProps =
  | { variant: "preview"; startDay: DayString; activeDays: number; placeboDays: number }
  | { variant: "live"; days: CalendarDay[] };

interface Dot {
  key: string;
  dotState: string;
  label: string;
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
    });
  }
  return dots;
}

function liveDots(days: CalendarDay[]): Dot[] {
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
      case "today":
        label = `Day ${position}, today`;
        break;
      case "upcoming":
        label = `Day ${position}, upcoming`;
        break;
      default:
        label = `Day ${position}, ${d.state}`;
    }
    return { key: d.day, dotState: d.state, label };
  });
}

export function PackPreviewStrip(props: StripProps) {
  const dots = props.variant === "preview"
    ? previewDots(props.startDay, props.activeDays, props.placeboDays)
    : liveDots(props.days);
  return (
    <ol aria-label="Pack days" className={styles.strip}>
      {dots.map((dot) => (
        <li key={dot.key} role="listitem" aria-label={dot.label} className={styles.item}>
          <span data-state={dot.dotState} aria-hidden="true" className={styles.dot}>
            {dot.dotState === "taken" ? <Check size={10} /> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
