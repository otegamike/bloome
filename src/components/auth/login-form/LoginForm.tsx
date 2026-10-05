"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button/Button";
import { TextField } from "@/components/ui/text-field/TextField";
import { GoogleButton } from "@/components/auth/google-button/GoogleButton";
import { isMockMode, setMockSignedIn } from "@/client/mockMode";
import { credentialsLoginSchema } from "@/lib/shared/schemas";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const urlError = searchParams.get("error");

  const validateField = (field: "email" | "password", value: string) => {
    const result = credentialsLoginSchema.shape[field].safeParse(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = credentialsLoginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === "email" || key === "password") {
          fieldErrors[key] ??= issue.message;
        }
      }
      setErrors(fieldErrors);
      document.getElementById("login-email")?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    if (isMockMode()) {
      setMockSignedIn(true);
      router.replace("/");
      return;
    }
    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (response?.error) {
      const next = failures + 1;
      setFailures(next);
      setFormError("That email and password don't match. Try again?");
      return;
    }
    setFailures(0);
    router.replace("/");
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Welcome back</h1>
      <GoogleButton />
      <div className={styles.divider}>
        <span>or</span>
      </div>
      {urlError ? (
        <p role="alert" className={styles.callout}>
          Something went wrong signing in with Google. Try again?
        </p>
      ) : null}
      {formError ? (
        <p role="alert" className={styles.callout}>
          {formError}
          {failures >= 3 ? " Having trouble? Try Google, or wait a few minutes and try again." : null}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <TextField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateField("email", email)}
          error={errors.email}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => validateField("password", password)}
          error={errors.password}
          showPasswordToggle
        />
        <Button type="submit" loading={submitting}>
          Log in
        </Button>
      </form>
      <p className={styles.switch}>
        New here? <a href="/register">Create an account</a>
      </p>
    </div>
  );
}
