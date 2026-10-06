"use client";

import { useId, useState } from "react";

import { Check } from "@/components/icons/Check";
import { Button } from "@/components/ui/button/Button";
import { Dialog } from "@/components/ui/dialog/Dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs/SegmentedTabs";
import { TextField } from "@/components/ui/text-field/TextField";
import { ApiClientError, createShortcutToken } from "@/client/apiClient";
import { useAlertStore } from "@/store/useAlertStore";
import type { ShortcutTokenDTO } from "@/types/api";
import styles from "./NewTokenDialog.module.css";

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never" },
] as const;

type ExpiryValue = (typeof EXPIRY_OPTIONS)[number]["value"];

interface NewTokenDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (token: ShortcutTokenDTO, secret: string) => void;
}

export function NewTokenDialog({ open, onClose, onCreated }: NewTokenDialogProps) {
  const titleId = useId();
  const [label, setLabel] = useState("My iPhone");
  const [expiry, setExpiry] = useState<ExpiryValue>("365");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const close = () => {
    if (secret) {
      useAlertStore.getState().addAlert({ kind: "success", message: "Token created" });
    }
    setLabel("My iPhone");
    setExpiry("365");
    setCreating(false);
    setError(null);
    setSecret(null);
    setCopied(false);
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = label.trim();
    if (!trimmed || trimmed.length > 40) {
      setError("Give this token a name (up to 40 characters).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await createShortcutToken({
        label: trimmed,
        expiresInDays: expiry === "never" ? null : (Number(expiry) as 30 | 90 | 365),
      });
      setSecret(result.secret);
      onCreated(result.token, result.secret);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Couldn't create that token. Try again?"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      useAlertStore.getState().addAlert({ kind: "error", message: "Couldn't copy that." });
    }
  };

  return (
    <Dialog open={open} onClose={secret ? () => {} : close} labelledBy={titleId}>
      {secret ? (
        <>
          <h2 id={titleId} className={styles.title}>
            Save your token
          </h2>
          <p className={styles.body}>
            This is the only time you&apos;ll see it. Anyone with this token can see whether today
            is logged. Treat it like a password. If you lose it, revoke this token and create a new
            one.
          </p>
          <div className={styles.secretRow}>
            <input
              type="text"
              readOnly
              value={secret}
              aria-label="Your new token"
              onFocus={(event) => event.target.select()}
              className={styles.secret}
            />
            <Button
              variant="secondary"
              iconLeft={copied ? <Check size={18} /> : undefined}
              onClick={() => void handleCopy()}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className={styles.actions}>
            <Button onClick={close}>I&apos;ve saved it</Button>
          </div>
        </>
      ) : (
        <>
          <h2 id={titleId} className={styles.title}>
            Create access token
          </h2>
          <div className={styles.form}>
            <TextField
              label="Token name"
              value={label}
              maxLength={40}
              onChange={(event) => setLabel(event.target.value)}
              error={error ?? undefined}
            />
            <SegmentedTabs
              label="Token expiry"
              options={EXPIRY_OPTIONS}
              active={expiry}
              onChange={setExpiry}
            />
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button loading={creating} onClick={() => void handleCreate()}>
              Create
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
