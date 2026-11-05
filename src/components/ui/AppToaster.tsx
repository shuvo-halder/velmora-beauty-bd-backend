import React from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      visibleToasts={5}
      duration={4000}
      className="toaster group font-sans text-sm"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:p-4 group-[.toaster]:gap-3 group-[.toaster]:border",
          description: "group-[.toast]:text-muted-foreground text-xs leading-relaxed mt-0.5",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs font-medium px-3 py-1.5 rounded-md",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border-border group-[.toast]:hover:bg-muted group-[.toast]:transition-colors",
          error:
            "group-[.toaster]:!bg-background group-[.toaster]:!border-destructive group-[.toaster]:!text-destructive dark:group-[.toaster]:!text-red-400",
          success:
            "group-[.toaster]:!bg-background group-[.toaster]:!border-emerald-500 group-[.toaster]:!text-emerald-600 dark:group-[.toaster]:!text-emerald-400",
          warning:
            "group-[.toaster]:!bg-background group-[.toaster]:!border-amber-500 group-[.toaster]:!text-amber-600 dark:group-[.toaster]:!text-amber-400",
          info:
            "group-[.toaster]:!bg-background group-[.toaster]:!border-blue-500 group-[.toaster]:!text-blue-600 dark:group-[.toaster]:!text-blue-400",
        },
      }}
      style={{
        zIndex: 99999,
      }}
    />
  );
}
