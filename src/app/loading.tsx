import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </main>
  );
}
