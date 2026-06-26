import MyDrawer from "@/components/myDrawer";
import { createContext, useState, useCallback, useMemo } from "react";

type DrawerOptions = {
  trigger?: any
  content: any
  title?: string
  description?: string
  withForm?: boolean
  formId?: string
  outerClose?: boolean
  className?: string
  direction?: 'top' | 'bottom' | 'left' | 'right'
  actionSubmit?: (data: any) => void
}

type DrawerContextValue = {
  openDrawer: (options: DrawerOptions) => void
  closeDrawer: () => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export const DrawerContext = createContext<DrawerContextValue>({} as DrawerContextValue);

export const ContextDrawerComponent = ({ children }: { children: React.ReactNode }) => {
  const [drawer, setDrawer] = useState<DrawerOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openDrawer = useCallback((options: DrawerOptions) => {
    setDrawer(options);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
  }, []);

  const value = useMemo(() => ({ openDrawer, closeDrawer, isLoading, setIsLoading }), [openDrawer, closeDrawer, isLoading]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
      {drawer && (
        <MyDrawer
          open={true}
          title={drawer.title}
          isLoading={isLoading}
          formId={drawer.formId}
          trigger={drawer.trigger}
          content={drawer.content}
          withForm={drawer.withForm}
          setIsLoading={setIsLoading}
          className={drawer.className}
          outerClose={drawer.outerClose}
          direction={drawer.direction}
          description={drawer.description}
          actionSubmit={drawer.actionSubmit}
          setOpen={open => { if (!open) closeDrawer(); }}
        />
      )}
    </DrawerContext.Provider>
  );
};
