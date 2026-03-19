import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "管理画面ログイン",
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
