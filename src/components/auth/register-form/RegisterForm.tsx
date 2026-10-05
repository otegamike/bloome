"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/Button";
import { TextField } from "@/components/ui/text-field/TextField";
import { GoogleButton } from "@/components/auth/google-button/GoogleButton";
import { ApiClientError, register } from "@/client/apiClient";
import { isMockMode, setMockSignedIn } from "@/client/mockMode";
import { registerSchema } from "@/lib/shared/schemas";
import styles from "./RegisterForm.module.css";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordOk = password.length >= 8;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = registerSchema.safeParse({ name, email, password, timezone });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === "name" || key === "email" || key === "password") {
          fieldErrors[key] ??= issue.message;
        }
      }
      setErrors(fieldErrors);
      const firstInvalid = fieldErrors.name ? "register-name" : fieldErrors.email ? "register-email" : "register-password";
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password, timezone });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiClientError && error.status === 409) {
        setFormError(
          "We couldn't create an account with those details. If you already have one, try signing in.",
        );
        return;
      }
      if (error instanceof ApiClientError && error.fields) {
        const fieldErrors: { name?: string; email?: string; password?: string } = {};
        for (const [key, messages] of Object.entries(error.fields)) {
          if ((key === "name" || key === "email" || key === "password") && messages[0]) {
            fieldErrors[key] = messages[0];
          }
        }
        setErrors(fieldErrors);
        return;
      }
      setFormError("Something went wrong. Try again?");
      return;
    }
    if (isMockMode()) {
      setMockSignedIn(true);
      router.replace("/onboarding");
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.replace("/onboarding");
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Create your account</h1>
      <GoogleButton callbackUrl="/onboarding" />
      <div className={styles.divider}>
        <span>or</span>
      </div>
      {formError ? (
        <p role="alert" className={styles.callout}>
          {formError}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <TextField
          id="register-name"
          label="Name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <TextField
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          helper={passwordOk ? "Looking good" : "At least 8 characters"}
          showPasswordToggle
        />
        <Button type="submit" loading={submitting}>
          Create account
        </Button>
      </form>
      <p className={styles.switch}>
        Already have one? <a href="/login">Log in</a>
      </p>
    </div>
  );
}
