import { useMemo } from "react";
import { useFieldContext } from "@/components/main-form";
import clsx from "clsx";
import { Textarea } from "../ui/text-area";

interface FormTextFieldProps {
  onChange?: any,
  className?: string,
  placeholder?: string,
  otherValue?: string | number,
}

export const FormTextAreaField = ({ placeholder, className, onChange, otherValue }: FormTextFieldProps) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => field.state.value as string | number | ReadonlyArray<string> | undefined, [field.state.value]);
  const fieldOnChange = useMemo(() => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onChange ? onChange(e.target.value) : field.handleChange(e.target.value), [field.handleChange]
  );
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  return (
    <div className={clsx("flex flex-col gap-1 w-full", className)}>
      <Textarea
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

export default FormTextAreaField;