import { useMemo } from "react";
import { useFieldContext } from "@/components/main-form";
import clsx from "clsx";
import { DatePicker } from '../ui/data-picker';

interface FormTextFieldProps {
  label?: string,
  onChange?: any,
  className?: string,
  placeholder?: string,
  type?: 'text' | 'number',
  otherValue?: string | number,
}

export const InputDate = ({ type = 'text', placeholder, label, className, onChange, otherValue }: FormTextFieldProps) => {
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
    <div className={clsx("flex flex-col gap-1 w-full", className)}>
      <DatePicker onChange={fieldOnChange} />
    </div>
  )
};

export default InputDate;