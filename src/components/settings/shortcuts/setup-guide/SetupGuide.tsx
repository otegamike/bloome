"use client";

import { useState } from "react";

import { Check } from "@/components/icons/Check";
import { Button } from "@/components/ui/button/Button";
import { useAlertStore } from "@/store/useAlertStore";
import styles from "./SetupGuide.module.css";

function useCopy(): { copiedKey: string | null; copy: (key: string, text: string) => void } {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    const done = () => {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => {
        useAlertStore.getState().addAlert({ kind: "error", message: "Couldn't copy that." });
      });
    } else {
      useAlertStore.getState().addAlert({ kind: "error", message: "Couldn't copy that." });
    }
  };
  return { copiedKey, copy };
}

export function SetupGuide({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { copiedKey, copy } = useCopy();
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/shortcuts/status` : "";

  return (
    <div className={styles.card}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={styles.toggle}
      >
        <span className={styles.heading}>How to set it up on your iPhone</span>
        <span className={styles.chevron} data-open={open ? "true" : "false"}>
          ›
        </span>
      </button>
      {open ? (
        <ol className={styles.steps}>
          <li>
            Open Shortcuts, go to <strong>Automation</strong>, tap <strong>New Automation</strong>,
            choose <strong>Time of Day</strong>, pick the time, set it to <strong>Daily</strong>,
            then choose <strong>Run Immediately</strong> and turn off{" "}
            <strong>Notify When Run</strong>.
          </li>
          <li>
            Add <strong>Get Contents of URL</strong>. Paste this URL with method{" "}
            <strong>GET</strong>:
            <span className={styles.copyRow}>
              <code className={styles.code}>{url}</code>
              <Button
                variant="ghost"
                size="sm"
                iconLeft={copiedKey === "url" ? <Check size={16} /> : undefined}
                onClick={() => copy("url", url)}
              >
                {copiedKey === "url" ? "Copied" : "Copy"}
              </Button>
            </span>
            Expand <strong>Show More</strong>, go to <strong>Headers</strong>, and add a header
            named
            <span className={styles.copyRow}>
              <code className={styles.code}>Authorization</code>
              <Button
                variant="ghost"
                size="sm"
                iconLeft={copiedKey === "header" ? <Check size={16} /> : undefined}
                onClick={() => copy("header", "Authorization")}
              >
                {copiedKey === "header" ? "Copied" : "Copy"}
              </Button>
            </span>
            with the value <code className={styles.code}>Bearer </code> followed by your token.
          </li>
          <li>
            Add <strong>Get Dictionary Value</strong> with the key{" "}
            <code className={styles.code}>remind</code>.
          </li>
          <li>
            Add <strong>If</strong>: that value <strong>is</strong> the number{" "}
            <code className={styles.code}>1</code>.
          </li>
          <li>
            Inside the If, add <strong>Get Dictionary Value</strong> with the key{" "}
            <code className={styles.code}>message</code> (from the contents of the URL), then add{" "}
            <strong>Show Notification</strong> with the title{" "}
            <code className={styles.code}>Bloome</code> (or any title you like) and the message as
            the body.
          </li>
          <li className={styles.tip}>
            Tip: add <code className={styles.code}>?tz=</code> followed by your timezone to the URL
            if you travel, for example <code className={styles.code}>?tz=Pacific/Auckland</code>.
          </li>
        </ol>
      ) : null}
    </div>
  );
}
