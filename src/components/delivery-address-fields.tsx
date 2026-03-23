"use client";

import { useState, useRef, useCallback } from "react";
import { useForm, getFormProps, getInputProps, getSelectProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { addressSchema } from "@/lib/validations";
import type { AddressFormData, AddressDraft } from "@/lib/validations";
import { PREFECTURES } from "@/lib/constants";
import { searchAddressByPostalCode } from "@/lib/postal-code";

export function areRequiredAddressFieldsFilled(values: AddressDraft): boolean {
  return Boolean(
    values.recipientName &&
    values.postalCode &&
    values.prefecture &&
    values.city &&
    values.line1
  );
}

function formatPostalCode(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
}

type Props = {
  defaultAddress: AddressDraft;
  onValidSubmit: (data: AddressFormData) => void;
};

export function DeliveryAddressFields({ defaultAddress, onValidSubmit }: Props) {
  const [currentValues, setCurrentValues] = useState<AddressDraft>(defaultAddress);
  const [isSearching, setIsSearching] = useState(false);
  const isSubmitDisabled = !areRequiredAddressFieldsFilled(currentValues);
  const line1Ref = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof AddressFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectChange = (field: keyof AddressFormData) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const [form, fields] = useForm({
    id: "delivery-address",
    defaultValue: defaultAddress,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: addressSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status === "success" && submission.value) {
        onValidSubmit(submission.value);
      }
    },
  });

  const lookupAddress = useCallback(async (postalCode: string) => {
    const digits = postalCode.replace(/-/g, "");
    if (digits.length !== 7) return;

    setIsSearching(true);
    try {
      const result = await searchAddressByPostalCode(postalCode);
      if (!result) return;

      form.update({ name: fields.prefecture.name, value: result.prefecture });
      form.update({ name: fields.city.name, value: result.city });

      setCurrentValues(prev => ({
        ...prev,
        prefecture: result.prefecture,
        city: result.city,
      }));

      line1Ref.current?.focus();
    } finally {
      setIsSearching(false);
    }
  }, [form, fields.prefecture.name, fields.city.name]);

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPostalCode(e.target.value);
    e.target.value = formatted;

    form.update({ name: fields.postalCode.name, value: formatted });
    setCurrentValues(prev => ({ ...prev, postalCode: formatted }));

    const digits = formatted.replace(/-/g, "");
    if (digits.length === 7) {
      lookupAddress(formatted);
    }
  };

  return (
    <form {...getFormProps(form)} className="space-y-4">
      <div>
        <label htmlFor={fields.recipientName.id} className="block text-sm font-medium text-gray-900">
          受取人名
        </label>
        <input
          {...getInputProps(fields.recipientName, { type: "text" })}
          onChange={handleInputChange("recipientName")}
          className="mt-1 w-full rounded border p-2"
        />
        {fields.recipientName.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.recipientName.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.postalCode.id} className="block text-sm font-medium text-gray-900">
          郵便番号
        </label>
        <div className="relative">
          <input
            {...getInputProps(fields.postalCode, { type: "text" })}
            onChange={handlePostalCodeChange}
            inputMode="numeric"
            placeholder="123-4567"
            maxLength={8}
            className="mt-1 w-full rounded border p-2"
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              検索中...
            </span>
          )}
        </div>
        {fields.postalCode.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.postalCode.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.prefecture.id} className="block text-sm font-medium text-gray-900">
          都道府県
        </label>
        <select
          {...getSelectProps(fields.prefecture)}
          onChange={handleSelectChange("prefecture")}
          className="mt-1 w-full rounded border bg-white p-2"
        >
          <option value="">選択してください</option>
          {PREFECTURES.map((pref) => (
            <option key={pref} value={pref}>
              {pref}
            </option>
          ))}
        </select>
        {fields.prefecture.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.prefecture.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.city.id} className="block text-sm font-medium text-gray-900">
          市区町村
        </label>
        <input
          {...getInputProps(fields.city, { type: "text" })}
          onChange={handleInputChange("city")}
          className="mt-1 w-full rounded border p-2"
        />
        {fields.city.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.city.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.line1.id} className="block text-sm font-medium text-gray-900">
          番地
        </label>
        <input
          {...getInputProps(fields.line1, { type: "text" })}
          ref={line1Ref}
          onChange={handleInputChange("line1")}
          className="mt-1 w-full rounded border p-2"
        />
        {fields.line1.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.line1.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.line2.id} className="block text-sm font-medium text-gray-900">
          建物名・部屋番号（任意）
        </label>
        <input
          {...getInputProps(fields.line2, { type: "text" })}
          className="mt-1 w-full rounded border p-2"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="mt-6 w-full cursor-pointer rounded-full bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        確認画面へ進む
      </button>
    </form>
  );
}
