"use client";

import { useEffect, useRef } from "react";

import { Close } from "@/components/icons/Close";
import styles from "./Dialog.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, labelledBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open) {
      opener.current = document.activeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
      const first = dialog.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      first?.focus();
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (opener.current instanceof HTMLElement) {
        opener.current.focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    const handleClose = () => onClose();
    const handleClick = (event: MouseEvent) => {
      if (event.target === dialog) {
        onClose();
      }
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy} className={styles.dialog}>
      <span aria-hidden="true" className={styles.handle} />
      <button type="button" onClick={onClose} aria-label="Close" className={styles.close}>
        <Close size={20} />
      </button>
      {children}
    </dialog>
  );
}
