import { useMemo } from "react";
import { useFieldContext } from "@/components/main-form";
import clsx from "clsx";
import { DatePicker } from '../ui/data-picker';

interface FormTextFieldProps {
  label?: string
  className?: string
}

export const InputDate = ({ label, className }: FormTextFieldProps) => {
  const field = useFieldContext();
  const fieldOnChange = useMemo(() => (value: any) => field.handleChange(value), [field.handleChange]);
  const errors = useMemo(() => field.state.meta.errors as Array<{ message: string }> | undefined, [field.state.meta.errors]);
  const isValid = useMemo(() => field.state.meta.isValid as boolean | undefined, [field.state.meta.isValid]);

  return (
    <div className={clsx("flex flex-col justify-start gap-1 w-full", className)}>
      <label className="text-sm ml-2 text-[#bbbfc7]">{label}</label>
      <DatePicker value={field.state.value as number | null | undefined} onChange={(v) => fieldOnChange(v ?? undefined)} />
      {!isValid && <div className="text-sm text-red-500 ml-2">{errors?.[0]?.message}</div>}
    </div>
  )
};

export default InputDate;
