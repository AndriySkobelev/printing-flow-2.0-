import { useMemo } from "react";
import { Input } from "../ui/input";
import { useFieldContext } from "@/components/main-form";
import clsx from "clsx";

interface FormTextFieldProps {
  label?: string,
  onChange?: any,
  className?: string,
  placeholder?: string,
  type: 'text' | 'number',
  otherValue?: string | number,
}

export const FormTextField = ({ type, placeholder, label, className, onChange, otherValue }: FormTextFieldProps) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | ReadonlyArray<string> | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange ? onChange(e.target.value) : field.handleChange(type === 'number' ? Number(e.target.value) : e.target.value), [field.handleChange]
  );
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  return (
    <div className={clsx("flex flex-col gap-1 w-full", className)}>
      {label ? <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div> : null}
      <Input
        type={type}
        name={name}
        value={otherValue || value}
        placeholder={placeholder}
        onChange={fieldOnChange}
        title={`${!isValid ? errors?.[0]?.message : ''}`}
        className="placeholder:text-gray-300 h-9.5 shadow-none bg-white"
      />
    </div>
  )
};

export default FormTextField;