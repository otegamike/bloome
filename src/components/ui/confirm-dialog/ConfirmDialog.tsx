"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button/Button";
import { Dialog } from "@/components/ui/dialog/Dialog";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirming?: boolean;
  confirmDisabled?: boolean;
  variant?: "danger" | "primary";
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  confirming = false,
  confirmDisabled = false,
  variant = "danger",
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p className={styles.body}>{body}</p>
      {children}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={variant} loading={confirming} disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
