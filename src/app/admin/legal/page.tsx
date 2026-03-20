import type { Metadata } from "next";
import { getLegalInfo } from "@/db/queries/legal-info";
import { LegalInfoEditor } from "@/components/admin/legal-info-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - 管理画面",
};

export default async function AdminLegalPage() {
  const info = await getLegalInfo();
  return <LegalInfoEditor initialData={info} />;
}
