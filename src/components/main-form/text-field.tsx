import { useMemo } from "react";
import { Input } from "../ui/input";
import { useFieldContext } from "@/components/main-form";

export const FormTextField = ({ type, placeholder, label }: { type: 'text' | 'number', placeholder?: string, label: string }) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | ReadonlyArray<string> | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (e: React.ChangeEvent<HTMLInputElement>) =>
    field.handleChange(type === 'number' ? Number(e.target.value) : e.target.value), [field.handleChange]
  );
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div>
      <Input
        type={type}
        name={name}
        value={value}
        onChange={fieldOnChange}
        placeholder={placeholder}
        className="placeholder:text-gray-300 h-[38px]"
      />
      {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  )
};

export default FormTextField;