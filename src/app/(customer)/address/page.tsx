import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";
import { getLatestAddressByLineUserId } from "@/db/queries/addresses";
import { AddressForm } from "@/components/address-form";

export const metadata: Metadata = {
  title: "受取方法",
};

export default async function AddressPage() {
  const session = await verifySession();
  const savedAddress = session
    ? await getLatestAddressByLineUserId(session.lineUserId)
    : null;

  return <AddressForm savedAddress={savedAddress} />;
}
