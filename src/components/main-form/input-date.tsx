import { useMemo } from "react";
import { useFieldContext } from "@/components/main-form";
import clsx from "clsx";
import { DatePicker } from '../ui/data-picker';

interface FormTextFieldProps {
  label?: string,
  onChange?: any,
  className?: string,
  placeholder?: string,
  otherValue?: string | number,
}

export const InputDate = ({ placeholder, label, className, onChange, otherValue }: FormTextFieldProps) => {
  const field = useFieldContext();
  const name = useMemo(() => field.name, [field.name]);
  const value = useMemo(() => {
    return field.state.value as string | number | ReadonlyArray<string> | undefined;
  }, [field.state.value]);
  console.log("🚀 ~ InputDate ~ value:", value)
  const fieldOnChange = useMemo(() => (value: any) => field.handleChange(value), [field.handleChange]
  );
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);
  return (
    <div className={clsx("flex flex-col justify-start gap-1 w-full", className)}>
      <DatePicker onChange={fieldOnChange} />
      {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  )
};

export default InputDate;