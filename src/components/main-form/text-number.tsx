import clsx from "clsx";
import { useMemo } from "react";
import { Input } from "../ui/input";
import { useFieldContext } from "@/components/main-form";

interface FormTextFieldProps {
  label?: string,
  onChange?: any,
  className?: string,
  placeholder?: string,
  type?: 'text' | 'number',
  otherValue?: string | number,
}

const ALLOWED_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
]);

export const FormTextNumberField = ({ type = 'text', placeholder, label, className, onChange, otherValue }: FormTextFieldProps) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);

  const rawValue = field.state.value;
  const displayValue = type === 'number'
    ? (rawValue === 0 || rawValue == null ? '' : String(rawValue))
    : rawValue as string | number | ReadonlyArray<string> | undefined;

  const fieldOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (type === 'number') {
      const sanitized = raw.replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
      field.handleChange(sanitized as never);
    } else {
      field.handleChange(raw as never);
    }
    onChange?.(e);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type !== 'number') return;
    if (ALLOWED_KEYS.has(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    const currentVal = String(rawValue ?? '');
    if (e.key === '.' && !currentVal.includes('.')) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);

  return (
    <div className={clsx("flex flex-col gap-1 w-full", className)}>
      {label ? <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div> : null}
      <Input
        type="text"
        name={name}
        value={displayValue}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        onChange={fieldOnChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        title={`${errors?.[0]?.message ?? ''}`}
        className={clsx(
          "placeholder:text-gray-300 h-9.5 shadow-none bg-white",
          !isValid && 'border-red-500',
        )}
      />
    </div>
  )
};

export default FormTextNumberField;
