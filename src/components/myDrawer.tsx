import clsx from "clsx";
import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from "./ui/drawer";
import { Button } from "@/components/ui/button";

type FooterProps = {
  formId?: string,
  isLoading: boolean,
  actionSubmit?: (data: any) => void
}

const Footer = ({ actionSubmit, isLoading, formId }: FooterProps) => {
  const submitType = actionSubmit ? 'button' : 'submit';
  return (
    <DrawerFooter className="flex items-center justify-end gap-2 w-full">
      <Button id="drawer-save" type={submitType} disabled={isLoading} form={formId} className="w-full md:w-full flex-1">
        {isLoading ? <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Підтвердження...</div> : 'Підтвердити'}
      </Button>
      <DrawerClose asChild className="w-full">
        <Button id="drawer-cancel" type="button" variant="outline" className="w-full md:w-full flex-1">Відмінити</Button>
      </DrawerClose>
    </DrawerFooter>
  )
}

const MyDrawer = ({
  open,
  title,
  formId,
  trigger,
  content,
  setOpen,
  withForm,
  className,
  description,
  actionSubmit,
  isLoading = false,
  outerClose = false,
  direction = 'bottom',
}: {
  open?: boolean,
  formId?: string,
  withForm?: boolean,
  className?: string,
  isLoading?: boolean,
  outerClose?: boolean,
  direction?: 'top' | 'bottom' | 'left' | 'right',
  title?: React.ReactNode,
  trigger?: React.ReactNode,
  content?: React.ReactNode | null,
  setOpen?: (open: boolean) => void,
  actionSubmit?: (data: any) => void,
  description?: React.ReactNode | null,
  setIsLoading?: (isLoading: boolean) => void,
}) => {
  return (
    <Drawer open={open} onOpenChange={setOpen} dismissible={outerClose} direction={direction}>
      {
        trigger
        ? <DrawerTrigger asChild>
            {trigger}
          </DrawerTrigger>
        : null
      }
      <DrawerContent className={clsx('flex flex-col', className)} direction={direction}>
        {
          isLoading && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/60 z-50 rounded-t-[10px]">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
          )
        }
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <div className="text-sm text-primary">{description}</div>
        </DrawerHeader>
        {content}
        <Footer
          formId={formId}
          isLoading={isLoading}
          actionSubmit={actionSubmit} />
      </DrawerContent>
    </Drawer>
  )
}

export default MyDrawer;
