import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      lineUserId: string;
      displayName: string;
      pictureUrl?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    lineUserId?: string;
    displayName?: string;
    pictureUrl?: string;
  }
}
