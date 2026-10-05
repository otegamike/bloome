"use client";

import { forwardRef, useId, useState } from "react";

import { Eye } from "@/components/icons/Eye";
import { EyeOff } from "@/components/icons/EyeOff";
import styles from "./TextField.module.css";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helper?: string;
  showPasswordToggle?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, helper, showPasswordToggle, id, type, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && visible ? "text" : type;
  const describedBy = [error ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputRow}>
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={error ? `${styles.input} ${styles.inputError}` : styles.input}
          {...rest}
        />
        {isPassword && showPasswordToggle ? (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className={styles.toggle}
          >
            {visible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}
      </div>
      {helper && !error ? (
        <p id={helperId} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
});
