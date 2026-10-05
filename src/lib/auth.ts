import "server-only";

import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  clearCredentialFailures,
  clientIp,
  isCredentialThrottled,
  recordCredentialFailure,
} from "@/lib/authThrottle";
import { credentialsLoginSchema } from "@/lib/shared/schemas";
import { findByEmailWithHash, findOrLinkGoogleUser } from "@/lib/userService";

// Fixed hash so unknown emails take the same time as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync("bloome-missing-account", 10);

/**
 * Auth.js v5 config. JWT session strategy with no database adapter —
 * the Credentials provider requires JWT, and the User model is managed
 * by hand with Mongoose.
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
      async authorize(credentials, req) {
        const parsed = credentialsLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ip = clientIp(req);
        if (await isCredentialThrottled(email, ip)) return null;
        const user = await findByEmailWithHash(email);
        const ok = user?.passwordHash
          ? await bcrypt.compare(password, user.passwordHash)
          : await bcrypt.compare(password, DUMMY_HASH);
        if (!ok || !user) {
          await recordCredentialFailure(email, ip);
          return null;
        }
        await clearCredentialFailures(email, ip);
        return { id: user._id.toString(), name: user.name, email: user.email };
      },
    }),
    Google,
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const googleProfile = profile as { email_verified?: unknown; email?: unknown } | null;
      const verified = googleProfile?.email_verified === true;
      const email = typeof user.email === "string" ? user.email : null;
      if (!verified || !email || googleProfile?.email !== email) return false;
      await findOrLinkGoogleUser({
        email,
        name: user.name ?? null,
        image: user.image ?? null,
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      if (!token.userId && token.email) {
        const found = await findByEmailWithHash(token.email);
        if (found) token.userId = found._id.toString();
      }
      return token;
    },
    session({ session, token }) {
      const userId = token.userId ?? token.sub;
      if (userId) session.userId = userId;
      return session;
    },
  },
});
