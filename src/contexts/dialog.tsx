import MyDialog from "@/components/myDialog";
import { createContext, useState, useCallback } from "react";

export const DialogContext = createContext<any>({});

export const ContextDialogComponent = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<DialogOptions | null>({
    trigger: null,
    content: null,
    title: '',
    isLoading: false,
    description: '',
    withForm: false,
    form: null,
    formId: '',
    className: ''
  });
  
  const openDialog = useCallback((options: DialogOptions) => {
    setIsOpen(true);
    setState({...options});
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // setState(null);
  }, []);
  const value = { openDialog, closeDialog, isLoading, setIsLoading };
  return (
    <DialogContext.Provider value={value}>
      {children}
      <MyDialog
        open={isOpen}
        setOpen={setIsOpen}
        title={state?.title}
        isLoading={isLoading}
        formId={state?.formId}
        trigger={state?.trigger}
        content={state?.content}
        withForm={state?.withForm}
        setIsLoading={setIsLoading}
        className={state?.className}
        description={state?.description}
        actionSubmit={state?.actionSubmit}
      />
    </DialogContext.Provider>
  );
};

type DialogOptions = {
  trigger?: any
  content: any,
  isLoading?: boolean,
  title?: string,
  description?: string,
  withForm?: boolean,
  form?: any,
  formId?: string,
  className?: string,
  actionSubmit?: (data: any) => void
}
