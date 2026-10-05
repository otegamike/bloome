import Link from "next/link";

// Placeholder. Real form lands in frontend.md + backend.md.
export default function LoginPage() {
  return (
    <main>
      <h1>Log in</h1>
      <p>Sign-in options (email + Google) are coming soon.</p>
      <p>
        No account yet? <Link href="/register">Register</Link>.
      </p>
    </main>
  );
}
