import MyDialog from "@/components/myDialog";
import { createContext, useState, useCallback, useMemo } from "react";

type DialogOptions = {
  trigger?: any
  content: any
  title?: string
  description?: string
  withForm?: boolean
  form?: any
  formId?: string
  outerClose?: boolean
  className?: string
  actionSubmit?: (data: any) => void
}

type DialogEntry = DialogOptions & { id: string }

type DialogContextValue = {
  openDialog: (options: DialogOptions) => string
  closeDialog: (id?: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const DialogContext = createContext<DialogContextValue>({} as DialogContextValue);

export const ContextDialogComponent = ({ children }: { children: React.ReactNode }) => {
  const [dialogs, setDialogs] = useState<DialogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const openDialog = useCallback((options: DialogOptions) => {
    const id = Math.random().toString(36).slice(2, 9);
    setDialogs(prev => [...prev, { ...options, id }]);
    return id;
  }, []);

  const closeDialog = useCallback((id?: string) => {
    setDialogs(prev => id ? prev.filter(d => d.id !== id) : prev.slice(0, -1));
  }, []);

  const value = useMemo(() => ({ openDialog, closeDialog, isLoading, setIsLoading }), [openDialog, closeDialog, isLoading]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialogs.map(dialog => (
        <MyDialog
          key={dialog.id}
          open={true}
          title={dialog.title}
          isLoading={isLoading}
          formId={dialog.formId}
          trigger={dialog.trigger}
          content={dialog.content}
          withForm={dialog.withForm}
          setIsLoading={setIsLoading}
          className={dialog.className}
          outerClose={dialog.outerClose}
          description={dialog.description}
          actionSubmit={dialog.actionSubmit}
          setOpen={open => { if (!open) closeDialog(dialog.id); }}
        />
      ))}
    </DialogContext.Provider>
  );
};
