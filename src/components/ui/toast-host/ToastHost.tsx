"use client";

import { useEffect, useRef } from "react";

import { Check } from "@/components/icons/Check";
import { Info } from "@/components/icons/Info";
import { useAlertStore } from "@/store/useAlertStore";
import styles from "./ToastHost.module.css";

const LIFETIME: Record<string, number> = {
  success: 5000,
  info: 5000,
  error: 7000,
};

function ToastIcon({ kind }: { kind: "success" | "info" | "error" }) {
  if (kind === "success") {
    return (
      <span className={`${styles.icon} ${styles.iconSuccess}`}>
        <Check size={16} />
      </span>
    );
  }
  return (
    <span className={kind === "error" ? `${styles.icon} ${styles.iconError}` : styles.icon}>
      <Info size={16} />
    </span>
  );
}

export function ToastHost() {
  const alerts = useAlertStore((s) => s.alerts);
  const dismiss = useAlertStore((s) => s.dismiss);

  return (
    <div aria-live="off" className={styles.stack}>
      {alerts.map((alert) => (
        <ToastItem
          key={alert.id}
          id={alert.id}
          kind={alert.kind}
          message={alert.message}
          actionLabel={alert.actionLabel}
          onAction={alert.onAction}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  kind,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  id: string;
  kind: "success" | "info" | "error";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: (id: string) => void;
}) {
  const remaining = useRef(LIFETIME[kind] ?? 5000);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const start = () => {
    clear();
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(id), remaining.current);
  };

  const pause = () => {
    clear();
    remaining.current -= Date.now() - startedAt.current;
  };

  useEffect(() => {
    start();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      data-kind={kind}
      className={styles.toast}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <ToastIcon kind={kind} />
      <p className={styles.message}>{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={() => {
            onAction();
            onDismiss(id);
          }}
          className={styles.action}
        >
          {actionLabel}
        </button>
      ) : null}
      <span aria-hidden="true" className={styles.progress} />
    </div>
  );
}
