"use server";

import { cookies } from "next/headers";
import crypto from "crypto";

type LoginResult = { success: true } | { success: false; error: string };

export async function loginAdmin(password: string): Promise<LoginResult> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "パスワードが正しくありません" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { success: true };
}
