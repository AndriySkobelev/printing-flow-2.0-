import { useContext } from "react";
import { useAppForm } from "@/components/main-form";
import WorkPerformedForm from './forms/work-performed'
import { DialogContext } from "@/contexts/dialog";
import { Button } from "@/components/ui/button";



export const Seamstress = () => {
  const { openDialog } = useContext(DialogContext)
  const handleAddProducts = () => {
    openDialog({
      title: 'Додайте вироби',
      content: <WorkPerformedForm
        formId="add-work-performed-form"/>,
      withForm: true,
      className: 'max-w-[600px]',
      formId: 'add-work-performed-form',
    });
  }
  return (
    <div>
      <Button type="button" onClick={handleAddProducts}>Додати вироби</Button>
    </div>
  );
};

export default Seamstress;