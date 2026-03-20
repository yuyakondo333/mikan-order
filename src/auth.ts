import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { verifyLineIdToken } from "@/lib/line-verify";

const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

const liffProvider = Credentials({
  id: "line-liff",
  credentials: {
    idToken: { type: "text" },
  },
  async authorize(credentials) {
    const idToken = credentials?.idToken;
    if (typeof idToken !== "string" || !idToken) return null;

    const verified = await verifyLineIdToken(idToken);
    if (!verified) return null;

    return {
      id: verified.sub,
      name: verified.name,
      image: verified.picture,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [liffProvider, Google],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/products" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email === process.env.ADMIN_EMAIL;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // LINE LIFF login
      if (user && account?.provider === "line-liff") {
        token.lineUserId = user.id;
        token.displayName = user.name ?? "";
        token.pictureUrl = user.image ?? undefined;
        token.role = "customer";
      }

      // Google admin login
      if (user && account?.provider === "google") {
        token.role = "admin";
        token.adminLoginAt = Math.floor(Date.now() / 1000);
      }

      // Expire admin session after 8 hours
      if (token.role === "admin" && token.adminLoginAt) {
        const elapsed = Math.floor(Date.now() / 1000) - token.adminLoginAt;
        if (elapsed > ADMIN_SESSION_MAX_AGE) {
          token.role = undefined;
          token.adminLoginAt = undefined;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.lineUserId) {
        session.user.lineUserId = token.lineUserId;
        session.user.displayName = token.displayName ?? "";
        session.user.pictureUrl = token.pictureUrl;
      }
      session.user.role = token.role;
      return session;
    },
  },
});
