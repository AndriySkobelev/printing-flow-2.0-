import { Button } from "../ui/button";
import { useFormContext } from "@/components/form";

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
    <form.Subscribe selector={(state: any) => state.isSubmitting}>
      {({ isSubmitting }) => (
        <Button type={type} disabled={isSubmitting} variant={variant} className="w-full" formNoValidate onClick={onClick}>
          {label}
        </Button>
      )}
    </form.Subscribe>
  )
};

export default FormButton;