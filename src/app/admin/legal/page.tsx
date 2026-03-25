import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { getLegalInfo } from "@/db/queries/legal-info";
import { LegalInfoEditor } from "@/components/admin/legal-info-editor";
import { LegalFormSkeleton } from "@/components/admin/skeletons";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - 管理画面",
};

async function LegalData() {
  const info = await getLegalInfo();
  return <LegalInfoEditor initialData={info} />;
}

export default async function AdminLegalPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) forbidden();
  return (
    <Suspense fallback={<LegalFormSkeleton />}>
      <LegalData />
    </Suspense>
  );
}
