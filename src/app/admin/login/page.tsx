import type { Metadata } from "next";
import { GoogleLoginButton } from "@/components/admin/google-login-button";

export const metadata: Metadata = {
  title: "管理画面ログイン",
};

export default function AdminLoginPage() {
  return <GoogleLoginButton />;
}
