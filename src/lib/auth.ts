import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

/**
 * Auth.js v5 config. JWT session strategy with no database adapter —
 * the Credentials provider requires JWT, and the User model is managed
 * by hand with Mongoose (wired up in backend.md).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Real lookup lands in backend.md. Returning null means "not signed in".
      authorize() {
        return null;
      },
    }),
    Google,
  ],
  callbacks: {
    // backend.md: upsert/link the Mongoose User on Google sign-in
    // (match by email only when the provider reports it verified).
    signIn() {
      return true;
    },
    // backend.md: copy the Mongo user id onto the token + session.
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.userId = token.sub;
      }
      return session;
    },
  },
});
