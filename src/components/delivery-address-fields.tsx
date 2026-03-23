"use client";

import { useState } from "react";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { addressSchema } from "@/lib/validations";
import type { AddressFormData } from "@/lib/validations";

export function areRequiredAddressFieldsFilled(values: AddressFormData): boolean {
  return Boolean(
    values.recipientName &&
    values.postalCode &&
    values.prefecture &&
    values.city &&
    values.line1
  );
}

type Props = {
  defaultAddress: AddressFormData;
  onValidSubmit: (data: AddressFormData) => void;
};

export function DeliveryAddressFields({ defaultAddress, onValidSubmit }: Props) {
  const [currentValues, setCurrentValues] = useState<AddressFormData>(defaultAddress);
  const isSubmitDisabled = !areRequiredAddressFieldsFilled(currentValues);

  const handleInputChange = (field: keyof AddressFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <input
          {...getInputProps(fields.postalCode, { type: "text" })}
          onChange={handleInputChange("postalCode")}
          placeholder="123-4567"
          className="mt-1 w-full rounded border p-2"
        />
        {fields.postalCode.errors && (
          <p className="mt-1 text-xs text-red-600">{fields.postalCode.errors[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor={fields.prefecture.id} className="block text-sm font-medium text-gray-900">
          都道府県
        </label>
        <input
          {...getInputProps(fields.prefecture, { type: "text" })}
          onChange={handleInputChange("prefecture")}
          className="mt-1 w-full rounded border p-2"
        />
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
