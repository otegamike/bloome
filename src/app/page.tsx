import Link from "next/link";

import { APP_NAME } from "@/lib/shared/config";

// Placeholder home. Becomes the calendar in frontend.md.
export default function Home() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Your gentle daily pill companion. The calendar lives here soon.</p>
      <p>
        <Link href="/login">Log in</Link> or <Link href="/register">create an account</Link>.
      </p>
    </main>
  );
}
