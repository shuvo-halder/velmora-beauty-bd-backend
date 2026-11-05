import { toast } from "sonner";
import { normalizeApiError, NormalizedApiError } from "./apiError";

export interface ToastOptions {
  id?: string | number;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: (toast: any) => void;
  onAutoClose?: (toast: any) => void;
}

// In-memory debounce cache to prevent duplicate toasts in rapid succession
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1200;

function shouldThrottle(message: string, description?: string): boolean {
  const key = `${message}::${description || ""}`;
  const now = Date.now();
  const lastShown = recentToasts.get(key);

  if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) {
    return true;
  }

  recentToasts.set(key, now);

  // Clean old entries periodically
  if (recentToasts.size > 50) {
    for (const [k, timestamp] of recentToasts.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS * 2) {
        recentToasts.delete(k);
      }
    }
  }

  return false;
}

function parseArgs(
  titleOrMessage: string,
  descOrOpts?: string | ToastOptions,
  opts?: ToastOptions
): { title: string; description?: string; options: ToastOptions } {
  let title = titleOrMessage;
  let description: string | undefined;
  let options: ToastOptions = {};

  if (typeof descOrOpts === "string") {
    description = descOrOpts;
    if (opts) options = opts;
  } else if (typeof descOrOpts === "object" && descOrOpts !== null) {
    options = descOrOpts;
    description = options.description;
  }

  return { title, description, options };
}

/**
 * Enterprise Admin Notification Service
 * Encapsulates Sonner toast notifications with type-safety, deduplication, and accessibility.
 */
export const notify = {
  /**
   * Success notification (default 3.5 seconds)
   */
  success(titleOrMessage: string, descOrOpts?: string | ToastOptions, opts?: ToastOptions) {
    const { title, description, options } = parseArgs(titleOrMessage, descOrOpts, opts);
    if (shouldThrottle(title, description)) return options.id || title;

    return toast.success(title, {
      description,
      duration: options.duration ?? 3500,
      id: options.id,
      action: options.action,
      cancel: options.cancel,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    });
  },

  /**
   * Error notification (default 7 seconds with clear visual weight)
   */
  error(titleOrMessage: string, descOrOpts?: string | ToastOptions, opts?: ToastOptions) {
    const { title, description, options } = parseArgs(titleOrMessage, descOrOpts, opts);
    if (shouldThrottle(title, description)) return options.id || title;

    return toast.error(title, {
      description,
      duration: options.duration ?? 7000,
      id: options.id,
      action: options.action,
      cancel: options.cancel,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    });
  },

  /**
   * Warning notification (default 5 seconds)
   */
  warning(titleOrMessage: string, descOrOpts?: string | ToastOptions, opts?: ToastOptions) {
    const { title, description, options } = parseArgs(titleOrMessage, descOrOpts, opts);
    if (shouldThrottle(title, description)) return options.id || title;

    return toast.warning(title, {
      description,
      duration: options.duration ?? 5000,
      id: options.id,
      action: options.action,
      cancel: options.cancel,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    });
  },

  /**
   * Informational notification (default 4 seconds)
   */
  info(titleOrMessage: string, descOrOpts?: string | ToastOptions, opts?: ToastOptions) {
    const { title, description, options } = parseArgs(titleOrMessage, descOrOpts, opts);
    if (shouldThrottle(title, description)) return options.id || title;

    return toast.info(title, {
      description,
      duration: options.duration ?? 4000,
      id: options.id,
      action: options.action,
      cancel: options.cancel,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    });
  },

  /**
   * Loading/Progress notification (persistent until replaced or dismissed)
   */
  loading(titleOrMessage: string, descOrOpts?: string | ToastOptions, opts?: ToastOptions) {
    const { title, description, options } = parseArgs(titleOrMessage, descOrOpts, opts);

    return toast.loading(title, {
      description,
      id: options.id,
      action: options.action,
      cancel: options.cancel,
    });
  },

  /**
   * Promise-based notification with automated loading, success, and error states
   */
  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    handlers: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: NormalizedApiError) => string);
      description?: string | ((dataOrError: any) => string);
    }
  ) {
    return toast.promise(promise, {
      loading: handlers.loading,
      success: (data: T) => {
        if (typeof handlers.success === "function") {
          return handlers.success(data);
        }
        return handlers.success;
      },
      error: (err: any) => {
        const normalized = normalizeApiError(err);
        if (typeof handlers.error === "function") {
          return handlers.error(normalized);
        }
        return normalized.message || handlers.error;
      },
      description: handlers.description,
    });
  },

  /**
   * Normalizes an API or runtime error and triggers a formatted error toast
   */
  apiError(error: unknown, fallbackMessage = "Operation failed. Please try again.", options?: ToastOptions) {
    const normalized = normalizeApiError(error, fallbackMessage);

    // If there are detailed field errors, format a concise summary for the description
    let description = options?.description;
    if (!description && normalized.errors && Object.keys(normalized.errors).length > 0) {
      const fieldList = Object.entries(normalized.errors)
        .slice(0, 3)
        .map(([field, msg]) => `• ${field}: ${msg}`)
        .join("\n");
      description = fieldList;
    }

    return this.error(normalized.message, description, {
      ...options,
      duration: options?.duration ?? 7000,
    });
  },

  /**
   * Dismisses a specific toast or all active toasts
   */
  dismiss(toastId?: string | number) {
    return toast.dismiss(toastId);
  },
};
