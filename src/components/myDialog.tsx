import clsx from "clsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// The image viewer (LIGHTBOX_CLASS in images-section) portals to <body>, outside
// this dialog: clicks there must not count as "outside", and Esc closes the
// viewer rather than the dialog while it's open.
const isInLightbox = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('.app-lightbox')
const isLightboxOpen = () => !!document.querySelector('.rc-image-preview-operations-wrapper.app-lightbox')

type FooterProps = {
  formId?: string,
  isLoading: boolean,
  actionSubmit?: (data: any) => void
}

const Footer = ({ actionSubmit, isLoading, formId }: FooterProps) => {
  return (
    <DialogFooter className="flex items-center justify-end gap-2 w-full">
    {
      actionSubmit
      ? <>
        <DialogClose asChild>
          <Button id="dialog-cancel" type="button" variant="outline" className=" w-full md:w-auto flex-1">Відмінити</Button>
        </DialogClose>
        <Button id="dialog-save" type="button" disabled={isLoading} onClick={actionSubmit} className="w-full md:w-auto flex-1">
          {isLoading ? <div className="flex items-center gap-2"> <Loader2 className="w-4 h-4 animate-spin" /> Підтвердження... </div> : 'Підтвердити'}
        </Button>
      </>
      : <>
        <DialogClose asChild>
          <Button id="dialog-cancel" type="button" variant="outline" className="w-full md:w-auto flex-1">Відмінити</Button>
        </DialogClose>
        <Button id="dialog-save" type="submit" disabled={isLoading} form={formId} className="w-full md:w-auto flex-1">
          {isLoading ? <div className="flex items-center gap-2"> <Loader2 className="w-4 h-4 animate-spin" /> Підтвердження... </div> : 'Підтвердити'}
        </Button>
      </>
    }
  </DialogFooter>
  )
}

export default function MyDialog({
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
}: {
  open?: boolean,
  formId?: string,
  withForm?: boolean,
  className?: string,
  isLoading?: boolean,
  outerClose?: boolean,
  title?: React.ReactNode,
  trigger?: React.ReactNode,
  content?: React.ReactNode | null,
  setOpen?: (open: boolean) => void,
  actionSubmit?: (data: any) => void,
  description?: React.ReactNode | null,
  setIsLoading?: (isLoading: boolean) => void,
}) {  
  return (
    // <div className="no-scrollbar max-h-[50vh] overflow-y-auto relative max-w-none">
      <Dialog open={open} onOpenChange={setOpen}>
        {
          trigger
          ? <DialogTrigger asChild>
              {trigger}
            </DialogTrigger>
          : null
        }
        <DialogContent
          className={clsx('max-w-none', className)}
          onInteractOutside={(event) => {
            if (!outerClose || isInLightbox(event.target)) return event.preventDefault()
          }}
          onEscapeKeyDown={(event) => {
            if (isLightboxOpen()) event.preventDefault()
          }}
        >
          {
            isLoading && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white/60 z-50 rounded-md">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            )
          }
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <div className="text-sm text-primary">{description}</div>
          </DialogHeader>
          {content}
          {
            withForm
            ? (
              <Footer
                formId={formId}
                isLoading={isLoading} 
                actionSubmit={actionSubmit}/>
            )
            : (
              <DialogClose asChild>
                <Button id="dialog-cancel" type="button" variant="outline" className=" w-full md:w-auto flex-1">Закрити</Button>
              </DialogClose>
            )
          }
        </DialogContent>
      </Dialog>
    // </div>
  )
};
