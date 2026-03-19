import "server-only";
import { cache } from "react";
import { auth } from "@/auth";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.lineUserId) return null;
  return {
    lineUserId: session.user.lineUserId,
    displayName: session.user.displayName,
    pictureUrl: session.user.pictureUrl,
  };
});
