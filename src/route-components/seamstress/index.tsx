import { useContext } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAppForm } from "@/components/main-form";
import WorkPerformedForm from './forms/work-performed'
import { DialogContext } from "@/contexts/dialog";
import { Button } from "@/components/ui/button";

export const Seamstress = () => {
  const { signIn } = useAuthActions();
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleSubmit = (values: any) => {
    console.log("🚀 ~ handleSubmit ~ values:", values)
    closeDialog();
  }

  const handleAddProducts = () => {
    openDialog({
      title: 'Додайте вироби',
      content: <WorkPerformedForm
        actionSubmit={handleSubmit}
        formId="add-work-performed-form"/>,
      withForm: true,
      outerClose: false,
      className: 'max-w-[600px]',
      formId: 'add-work-performed-form',
    });
  }
  return (
    <div>
      <Button type="button" onClick={handleAddProducts}>Додати вироби</Button>
      <Button type="button" onClick={() => signIn('google')}>Google sinIn</Button>
    </div>
  );
};

export default Seamstress;