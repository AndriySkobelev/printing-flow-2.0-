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

export const FormTextField = ({ type = 'text', placeholder, label, className, onChange, otherValue }: FormTextFieldProps) => { 
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | ReadonlyArray<string> | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (onChange) {
      onChange(raw);
    } else {
      field.handleChange(raw);
    }
  }, [field.handleChange]);

  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  return (
    <div className={clsx("flex flex-col gap-1 w-full", className)}>
      {label ? <div className="text-sm text-[#bbbfc7] capitalize ml-2">{label}</div> : null}
      <Input
        type={type}
        name={name}
        onChange={fieldOnChange}
        placeholder={placeholder}
        value={otherValue || value}
        title={`${!isValid ? errors?.[0]?.message : ''}`}
        className={clsx(
          "placeholder:text-gray-300 h-9.5 shadow-none bg-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]",
          !isValid && 'border-red-500',
        )}
      />
      {/* {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>} */}
    </div>
  )
};

export default FormTextField;