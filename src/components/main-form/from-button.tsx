import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useFormContext } from "@/components/main-form";

export const FormButton = ({
  label,
  onClick,
  type = 'submit',
  variant = 'default'
}: {
  label: React.ReactNode,
  type?: 'submit' | 'button' | 'reset',
  onClick?: () => void,
  variant?: "outline" | "default" | "destructive" | "ghost" | "link" | "secondary" | null | undefined
}) => {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state: any) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button type={type} disabled={!canSubmit} variant={variant} className="w-full" formNoValidate onClick={onClick}>
          {label}
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        </Button>
      )}
    </form.Subscribe>
  )
};

export default FormButton;