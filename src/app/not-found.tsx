import Link from "next/link";

import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import styles from "./NotFound.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.wilted}>
        <BloomMark size={96} />
      </div>
      <h1 className={styles.title}>We couldn&apos;t find that page</h1>
      <Link href="/" className={styles.homeLink}>
        Back home
      </Link>
    </main>
  );
}
