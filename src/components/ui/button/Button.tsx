"use client";

import { forwardRef } from "react";

import { Spinner } from "@/components/icons/Spinner";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, iconLeft, children, disabled, className, ...rest },
  ref,
) {
  const classes = [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {loading ? (
        <span className={styles.loadingSlot}>
          <Spinner size={18} />
        </span>
      ) : (
        <>
          {iconLeft ? <span className={styles.icon}>{iconLeft}</span> : null}
          <span className={styles.label}>{children}</span>
        </>
      )}
    </button>
  );
});
