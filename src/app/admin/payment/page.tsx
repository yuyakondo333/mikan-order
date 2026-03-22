import { Suspense } from "react";
import type { Metadata } from "next";
import { getPaymentSettings } from "@/db/queries/payment-settings";
import { PaymentSettingsEditor } from "@/components/admin/payment-settings-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "お支払い設定 - 管理画面",
};

async function PaymentData() {
  const settings = await getPaymentSettings();
  return <PaymentSettingsEditor initialData={settings} />;
}

export default function AdminPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-24 rounded bg-gray-200" />
              <div className="h-12 w-full rounded bg-gray-200" />
            </div>
          ))}
        </div>
      }
    >
      <PaymentData />
    </Suspense>
  );
}
