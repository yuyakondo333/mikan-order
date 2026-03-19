import type { Metadata } from "next";
import { AddressForm } from "@/components/address-form";

export const metadata: Metadata = {
  title: "受取方法",
};

export default function AddressPage() {
  return <AddressForm />;
}
