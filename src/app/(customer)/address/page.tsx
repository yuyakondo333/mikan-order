"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/liff-provider";
import { TIME_SLOT_OPTIONS, getPickupDateOptions } from "@/lib/constants";
import type { FulfillmentMethod, PickupTimeSlot } from "@/types";

export default function AddressPage() {
  const router = useRouter();
  const { profile } = useLiff();
  const [method, setMethod] = useState<FulfillmentMethod>("pickup");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState<PickupTimeSlot | "">("");
  const pickupDateOptions = getPickupDateOptions();
  const [addressForm, setAddressForm] = useState({
    recipientName: "",
    postalCode: "",
    prefecture: "",
    city: "",
    line1: "",
    line2: "",
  });
  const [loadingAddress, setLoadingAddress] = useState(true);

  useEffect(() => {
    if (!profile?.userId) {
      setLoadingAddress(false);
      return;
    }

    async function fetchSavedAddress() {
      try {
        const res = await fetch(
          `/api/addresses?userId=${encodeURIComponent(profile!.userId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.length > 0) {
          const latest = data[0];
          setAddressForm({
            recipientName: latest.recipientName ?? "",
            postalCode: latest.postalCode ?? "",
            prefecture: latest.prefecture ?? "",
            city: latest.city ?? "",
            line1: latest.line1 ?? "",
            line2: latest.line2 ?? "",
          });
        }
      } catch {
        // 取得失敗時は空フォームのまま
      } finally {
        setLoadingAddress(false);
      }
    }
    fetchSavedAddress();
  }, [profile]);

  function handleAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });
  }

  const isPickupValid = method === "pickup" && pickupDate !== "" && pickupTimeSlot !== "";
  const isPostalCodeValid = /^\d{3}-?\d{4}$/.test(addressForm.postalCode.trim());
  const isDeliveryValid =
    method === "delivery" &&
    addressForm.recipientName.trim() !== "" &&
    isPostalCodeValid &&
    addressForm.prefecture.trim() !== "" &&
    addressForm.city.trim() !== "" &&
    addressForm.line1.trim() !== "";
  const canProceed = isPickupValid || isDeliveryValid;

  function handleProceed() {
    if (!canProceed) return;

    const orderData =
      method === "pickup"
        ? { fulfillmentMethod: "pickup" as const, pickupDate, pickupTimeSlot }
        : { fulfillmentMethod: "delivery" as const, address: addressForm };

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
          {loadingAddress ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-300 border-t-orange-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  受取人名
                </label>
                <input
                  name="recipientName"
                  value={addressForm.recipientName}
                  onChange={handleAddressChange}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  郵便番号
                </label>
                <input
                  name="postalCode"
                  value={addressForm.postalCode}
                  onChange={handleAddressChange}
                  placeholder="123-4567"
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  都道府県
                </label>
                <input
                  name="prefecture"
                  value={addressForm.prefecture}
                  onChange={handleAddressChange}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  市区町村
                </label>
                <input
                  name="city"
                  value={addressForm.city}
                  onChange={handleAddressChange}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  番地
                </label>
                <input
                  name="line1"
                  value={addressForm.line1}
                  onChange={handleAddressChange}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  建物名・部屋番号（任意）
                </label>
                <input
                  name="line2"
                  value={addressForm.line2}
                  onChange={handleAddressChange}
                  className="mt-1 w-full rounded border p-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 確認画面へ進むボタン */}
      <button
        onClick={handleProceed}
        disabled={!canProceed}
        className="mt-6 w-full rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        確認画面へ進む
      </button>
    </div>
  );
}
