import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const Drawer = ({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root data-slot="drawer" {...props} />
)

const DrawerTrigger = ({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) => (
  <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
)

const DrawerPortal = ({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) => (
  <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
)

const DrawerClose = ({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) => (
  <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
)

const DrawerOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) => (
  <DrawerPrimitive.Overlay
    data-slot="drawer-overlay"
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
)

const directionStyles: Record<string, string> = {
  bottom: "inset-x-0 bottom-0 mt-24 h-auto flex-col rounded-t-[10px]",
  top:    "inset-x-0 top-0 mb-24 h-auto flex-col rounded-b-[10px]",
  right:  "inset-y-0 right-0 w-auto flex-row rounded-l-[10px]",
  left:   "inset-y-0 left-0 w-auto flex-row rounded-r-[10px]",
}

const DrawerContent = ({
  className,
  children,
  direction = "bottom",
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  direction?: "top" | "bottom" | "left" | "right"
}) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={cn(
        "bg-background fixed z-50 flex border",
        directionStyles[direction],
        className
      )}
      {...props}
    >
      {(direction === "bottom" || direction === "top") && (
        <div className="bg-muted mx-auto mt-4 h-2 w-25 rounded-full" />
      )}
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
)

const DrawerHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="drawer-header"
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)

const DrawerFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="drawer-footer"
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)

const DrawerTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) => (
  <DrawerPrimitive.Title
    data-slot="drawer-title"
    className={cn("text-lg leading-none font-semibold", className)}
    {...props}
  />
)

const DrawerDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) => (
  <DrawerPrimitive.Description
    data-slot="drawer-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
)

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
}
