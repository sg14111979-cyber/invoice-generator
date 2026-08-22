"use client";

import { TextField } from "@/components/field";

export interface CustomerValues {
  name: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  email: string;
  phone: string;
  taxNumber: string;
}

export const EMPTY_CUSTOMER: CustomerValues = {
  name: "",
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  email: "",
  phone: "",
  taxNumber: "",
};

/** Shared customer field grid, reused by the Customers page and the invoice editor. */
export function CustomerFields({
  values,
  onChange,
}: {
  values: CustomerValues;
  onChange: (values: CustomerValues) => void;
}) {
  function set<K extends keyof CustomerValues>(key: K, value: CustomerValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField
        label="Customer name"
        value={values.name}
        onChange={(value) => set("name", value)}
        required
      />
      <TextField
        label="Company name"
        value={values.companyName}
        onChange={(value) => set("companyName", value)}
      />
      <TextField
        label="Address line 1"
        value={values.addressLine1}
        onChange={(value) => set("addressLine1", value)}
      />
      <TextField
        label="Address line 2"
        value={values.addressLine2}
        onChange={(value) => set("addressLine2", value)}
      />
      <TextField label="City" value={values.city} onChange={(value) => set("city", value)} />
      <TextField label="State" value={values.state} onChange={(value) => set("state", value)} />
      <TextField
        label="Postal code"
        value={values.postalCode}
        onChange={(value) => set("postalCode", value)}
      />
      <TextField
        label="Country"
        value={values.country}
        onChange={(value) => set("country", value)}
      />
      <TextField
        label="Email"
        type="email"
        value={values.email}
        onChange={(value) => set("email", value)}
      />
      <TextField label="Phone" value={values.phone} onChange={(value) => set("phone", value)} />
      <TextField
        label="Tax / GST / VAT number"
        value={values.taxNumber}
        onChange={(value) => set("taxNumber", value)}
      />
    </div>
  );
}
