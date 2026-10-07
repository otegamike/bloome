"use client";

import { useRef, useState } from "react";

import styles from "./PullRefresh.module.css";

type PullState = "idle" | "pulling" | "ready" | "refreshing";

const PULL_THRESHOLD = 70;

interface PullRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}

function labelFor(state: PullState): string {
  if (state === "pulling") {
    return "Pull to refresh";
  }
  if (state === "ready") {
    return "Release to refresh";
  }
  if (state === "refreshing") {
    return "Refreshing…";
  }
  return "";
}

/**
 * Home-only pull to refresh for touch devices. In standalone PWA mode the
 * browser has no native pull gesture, so this covers that gap. Desktop users
 * keep the inline retry buttons; this wrapper stays inert for them.
 */
export function PullRefresh({ onRefresh, children }: PullRefreshProps) {
  const [state, setState] = useState<PullState>("idle");
  const startY = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (state === "refreshing") {
      return;
    }
    if (typeof window !== "undefined" && window.scrollY > 0) {
      startY.current = null;
      return;
    }
    const touch = event.touches[0];
    if (touch) {
      startY.current = touch.clientY;
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (state === "refreshing" || startY.current === null) {
      return;
    }
    if (typeof window !== "undefined" && window.scrollY > 0) {
      return;
    }
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const distance = touch.clientY - startY.current;
    if (distance <= 10) {
      setState("idle");
      return;
    }
    setState(distance >= PULL_THRESHOLD ? "ready" : "pulling");
  };

  const handleTouchEnd = () => {
    if (state === "refreshing") {
      startY.current = null;
      return;
    }
    const shouldRefresh = state === "ready";
    startY.current = null;
    if (!shouldRefresh) {
      setState("idle");
      return;
    }
    setState("refreshing");
    void Promise.resolve()
      .then(() => onRefresh())
      .catch(() => undefined)
      .finally(() => {
        setState("idle");
      });
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={styles.wrapper}
    >
      <div role="status" data-state={state} className={styles.indicator}>
        {state === "refreshing" ? <span aria-hidden="true" className={styles.spinner} /> : null}
        <span className={styles.label}>{labelFor(state)}</span>
      </div>
      {children}
    </div>
  );
}
