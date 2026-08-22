"use client";

import { useEffect, useState } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  hint?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  className,
  hint,
}: TextFieldProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  suffix?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
  suffix,
}: NumberFieldProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">
        {label}
        {suffix ? <span className="ml-1 normal-case text-slate-400">{suffix}</span> : null}
      </span>
      <NumberInput value={value} onChange={onChange} min={min} max={max} step={step} />
    </label>
  );
}

/**
 * Number input that keeps what the user typed while editing, so clearing the box
 * doesn't leave a stray "0" in front of the next digits.
 */
function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step: number;
}) {
  const [text, setText] = useState(String(Number.isFinite(value) ? value : 0));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(String(Number.isFinite(value) ? value : 0));
  }, [value, editing]);

  return (
    <input
      className="input"
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      step={step}
      onFocus={(event) => {
        setEditing(true);
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const parsed = Number(next);
        onChange(next.trim() === "" || !Number.isFinite(parsed) ? 0 : parsed);
      }}
      onBlur={() => {
        setEditing(false);
        setText(String(Number.isFinite(value) ? value : 0));
      }}
    />
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  className,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <textarea
        className="input"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SelectFieldProps<T>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
