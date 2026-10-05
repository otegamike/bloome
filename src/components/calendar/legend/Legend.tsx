import { Check } from "@/components/icons/Check";
import styles from "./Legend.module.css";

export function Legend() {
  return (
    <ul aria-label="Calendar legend" className={styles.legend}>
      <li className={styles.item}>
        <span data-state="taken" className={styles.sw}>
          <Check size={8} />
        </span>
        Taken
      </li>
      <li className={styles.item}>
        <span data-state="missed" className={styles.sw} />
        Missed
      </li>
      <li className={styles.item}>
        <span data-state="placebo" className={styles.sw} />
        Placebo
      </li>
      <li className={styles.item}>
        <span data-state="skipped" className={styles.sw} />
        Skipped
      </li>
      <li className={styles.item}>
        <span data-state="today" className={styles.sw} />
        Today
      </li>
    </ul>
  );
}
