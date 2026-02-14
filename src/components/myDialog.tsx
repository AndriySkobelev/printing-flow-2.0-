import { memo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default memo(function MyDialog({
  open,
  title,
  formId,
  trigger,
  content,
  setOpen,
  className,
  description,
  actionSubmit,
  isLoading = true,
}: {
  open?: boolean,
  formId?: string,
  withForm?: boolean,
  className?: string,
  isLoading?: boolean,
  title?: React.ReactNode,
  trigger?: React.ReactNode,
  content?: React.ReactNode | null,
  setOpen?: (open: boolean) => void,
  actionSubmit?: (data: any) => void,
  description?: React.ReactNode | null,
  setIsLoading?: (isLoading: boolean) => void,
}) {  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {
        trigger
        ? <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
        : null
      }
      <DialogContent className={className}>
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
      </DialogContent>
    </Dialog>
  )
});