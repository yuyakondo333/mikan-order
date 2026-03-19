import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { upsertUser } from "@/db/queries/users";

export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.lineUserId) return null;
  return {
    lineUserId: session.user.lineUserId,
    displayName: session.user.displayName,
    pictureUrl: session.user.pictureUrl,
  };
});

export const getAuthenticatedUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  return upsertUser({
    lineUserId: session.lineUserId,
    displayName: session.displayName ?? "",
    pictureUrl: session.pictureUrl,
  });
});
