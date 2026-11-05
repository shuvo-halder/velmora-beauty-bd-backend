import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm();
  };

  const Icon = variant === "destructive" ? Trash2 : variant === "warning" ? AlertTriangle : Info;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-card text-card-foreground p-6 shadow-2xl rounded-xl border border-border sm:rounded-2xl transition-all duration-200 animate-in fade-in-0 zoom-in-95"
          )}
          role="alertdialog"
          aria-modal="true"
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "p-2.5 rounded-full shrink-0",
                variant === "destructive" && "bg-destructive/15 text-destructive",
                variant === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                variant === "default" && "bg-primary/15 text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="space-y-1.5 flex-1 pr-4">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close
              disabled={isLoading}
              onClick={handleCancel}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "default"}
              size="sm"
              disabled={isLoading}
              onClick={handleConfirm}
              className="w-full sm:w-auto font-semibold"
            >
              {isLoading ? "Processing..." : confirmText}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
