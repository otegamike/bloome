import { APP_NAME } from "@/lib/shared/config";
import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import styles from "./AuthLayout.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <section aria-hidden="true" className={styles.decor}>
        <BloomMark size={220} className={styles.dekorBloom} />
        <h2 className={styles.headline}>A gentle daily check-in</h2>
        <p className={styles.subtitle}>Soft reminders, a calm calendar, and your own pace.</p>
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalOne}`} />
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalTwo}`} />
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalThree}`} />
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalFour}`} />
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalFive}`} />
        <span aria-hidden="true" className={`${styles.petal} ${styles.petalSix}`} />
      </section>
      <section className={styles.form}>
        <div className={styles.mobileBrand}>
          <BloomMark size={56} />
          <p className={styles.wordmark}>{APP_NAME}</p>
        </div>
        <div className={styles.card}>{children}</div>
      </section>
    </main>
  );
}
