"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeliveryAddressFields } from "@/components/delivery-address-fields";
import { TIME_SLOT_OPTIONS, getPickupDateOptions } from "@/lib/constants";
import type { AddressFormData } from "@/lib/validations";
import type { FulfillmentMethod, PickupTimeSlot } from "@/types";

type SavedAddressRow = {
  recipientName: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2: string | null;
};

type Props = {
  savedAddress: SavedAddressRow | null;
};

export function AddressForm({ savedAddress }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<FulfillmentMethod>("pickup");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState<PickupTimeSlot | "">("");
  const pickupDateOptions = getPickupDateOptions();

  const defaultAddress: AddressFormData = savedAddress
    ? {
        recipientName: savedAddress.recipientName ?? "",
        postalCode: savedAddress.postalCode ?? "",
        prefecture: savedAddress.prefecture ?? "",
        city: savedAddress.city ?? "",
        line1: savedAddress.line1 ?? "",
        line2: savedAddress.line2 ?? "",
      }
    : {
        recipientName: "",
        postalCode: "",
        prefecture: "",
        city: "",
        line1: "",
        line2: "",
      };

  const isPickupValid = method === "pickup" && pickupDate !== "" && pickupTimeSlot !== "";

  function handlePickupProceed() {
    if (!isPickupValid) return;
    const orderData = { fulfillmentMethod: "pickup" as const, pickupDate, pickupTimeSlot };
    sessionStorage.setItem("orderFulfillment", JSON.stringify(orderData));
    router.push("/confirm");
  }

  function handleDeliverySubmit(address: AddressFormData) {
    const orderData = { fulfillmentMethod: "delivery" as const, address };
    sessionStorage.setItem("orderFulfillment", JSON.stringify(orderData));
    router.push("/confirm");
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <h1 className="mb-6 text-2xl font-bold text-orange-600">受取方法</h1>

      {/* 受取方法選択 */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => setMethod("pickup")}
          className={`flex-1 rounded-lg border-2 py-3 text-center font-medium transition ${
            method === "pickup"
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-orange-300"
          }`}
        >
          取り置き
        </button>
        <button
          onClick={() => setMethod("delivery")}
          className={`flex-1 rounded-lg border-2 py-3 text-center font-medium transition ${
            method === "delivery"
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-orange-300"
          }`}
        >
          お届け
        </button>
      </div>

      {/* 支払い方法の案内 */}
      <div className="mb-4 rounded-lg bg-white p-3 text-sm text-gray-600 shadow-sm">
        {method === "pickup" ? (
          <p>お支払い: <span className="font-medium text-gray-900">受け取り時に現金でお支払い</span></p>
        ) : (
          <p>お支払い: <span className="font-medium text-gray-900">銀行振込</span></p>
        )}
      </div>

      {/* 取り置きフォーム */}
      {method === "pickup" && (
        <div className="space-y-4">
          {/* 受取日 */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-3 font-medium text-gray-900">
              受取日を選んでください
            </p>
            <select
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full rounded border p-3 text-gray-900"
            >
              <option value="">日付を選択</option>
              {pickupDateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 受取時間帯 */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-3 font-medium text-gray-900">
              時間帯を選んでください
            </p>
            <div className="space-y-2">
              {TIME_SLOT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${
                    pickupTimeSlot === option.value
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="pickupTimeSlot"
                    value={option.value}
                    checked={pickupTimeSlot === option.value}
                    onChange={() => setPickupTimeSlot(option.value)}
                    className="accent-orange-500"
                  />
                  <span className="text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* お届けフォーム */}
      {method === "delivery" && (
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <DeliveryAddressFields
            key={JSON.stringify(defaultAddress)}
            defaultAddress={defaultAddress}
            onValidSubmit={handleDeliverySubmit}
          />
        </div>
      )}

      {/* 取り置き: 確認画面へ進むボタン */}
      {method === "pickup" && (
        <button
          onClick={handlePickupProceed}
          disabled={!isPickupValid}
          className="mt-6 w-full rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          確認画面へ進む
        </button>
      )}
    </div>
  );
}
