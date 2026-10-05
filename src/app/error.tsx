"use client";

import { useEffect } from "react";

import { BloomMark } from "@/components/brand/bloom-mark/BloomMark";
import { Button } from "@/components/ui/button/Button";
import styles from "./Error.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <div className={styles.wilted}>
        <BloomMark size={96} />
      </div>
      <h1 className={styles.title}>Something went a little sideways</h1>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
