import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyLineIdToken } from "@/lib/line-verify";

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
  providers: [liffProvider],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/products" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.lineUserId = user.id;
        token.displayName = user.name ?? "";
        token.pictureUrl = user.image ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.lineUserId = token.lineUserId as string;
      session.user.displayName = token.displayName as string;
      session.user.pictureUrl = token.pictureUrl as string | undefined;
      return session;
    },
  },
});
