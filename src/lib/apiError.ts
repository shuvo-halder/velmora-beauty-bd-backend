import axios, { AxiosError } from "axios";

export interface NormalizedApiError {
  success: false;
  status: number;
  code: string;
  message: string;
  errors?: Record<string, string>;
  raw?: any;
}

/**
 * Normalizes any error (Axios, Network, Timeout, Zod, or generic Error)
 * into a predictable, safe, and user-friendly data structure.
 */
export function normalizeApiError(error: unknown, fallbackMessage = "An unexpected error occurred."): NormalizedApiError {
  if (!error) {
    return {
      success: false,
      status: 500,
      code: "UNKNOWN_ERROR",
      message: fallbackMessage,
    };
  }

  // Handle AxiosError
  if (axios.isAxiosError(error) || (error as any).isAxiosError) {
    const axiosErr = error as AxiosError<any>;

    // Network & Timeout Errors
    if (axiosErr.code === "ECONNABORTED" || axiosErr.message?.toLowerCase().includes("timeout")) {
      return {
        success: false,
        status: 408,
        code: "TIMEOUT_ERROR",
        message: "The request took too long to complete. Please check your network and try again.",
        raw: axiosErr,
      };
    }

    if (axiosErr.code === "ERR_NETWORK" || !axiosErr.response) {
      return {
        success: false,
        status: 0,
        code: "NETWORK_ERROR",
        message: "Unable to connect to the server. Please check your internet connection.",
        raw: axiosErr,
      };
    }

    const response = axiosErr.response;
    const status = response?.status || 500;
    const responseData = response?.data;

    let code = "API_ERROR";
    let message = fallbackMessage;
    const errors: Record<string, string> = {};

    // 1. Check for standard backend error contract: { success: false, error: { code, message, details } }
    if (responseData?.error) {
      if (typeof responseData.error === "string") {
        message = responseData.error;
      } else if (typeof responseData.error === "object") {
        code = responseData.error.code || code;
        message = responseData.error.message || message;

        // Parse details array (e.g. Zod validation errors)
        if (Array.isArray(responseData.error.details)) {
          responseData.error.details.forEach((item: any) => {
            if (item.field && item.message) {
              errors[item.field] = item.message;
            }
          });
        }
      }
    } else if (responseData?.message) {
      // 2. Check for { message: "...", errors: [...] } or { status: "error", message: "..." }
      message = responseData.message;
      if (responseData.code) code = responseData.code;

      if (Array.isArray(responseData.errors)) {
        responseData.errors.forEach((item: any) => {
          if (item.field && item.message) {
            errors[item.field] = item.message;
          }
        });
      } else if (responseData.errors && typeof responseData.errors === "object") {
        Object.assign(errors, responseData.errors);
      }
    }

    // Assign standard semantic codes based on HTTP status if code remains generic
    if (code === "API_ERROR") {
      switch (status) {
        case 400:
          code = "BAD_REQUEST";
          break;
        case 401:
          code = "UNAUTHORIZED";
          message = message === fallbackMessage ? "Your session has expired. Please sign in again." : message;
          break;
        case 403:
          code = "FORBIDDEN";
          message = message === fallbackMessage ? "Access denied. You do not possess the required permission." : message;
          break;
        case 404:
          code = "NOT_FOUND";
          message = message === fallbackMessage ? "The requested resource was not found." : message;
          break;
        case 409:
          code = "CONFLICT";
          message = message === fallbackMessage ? "A record with these details already exists." : message;
          break;
        case 422:
          code = "UNPROCESSABLE_ENTITY";
          message = message === fallbackMessage ? "Please correct the highlighted fields." : message;
          break;
        case 429:
          code = "RATE_LIMITED";
          message = message === fallbackMessage ? "Too many requests. Please wait a moment and try again." : message;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = "SERVER_ERROR";
          message = message === fallbackMessage ? "Something went wrong on the server. Please try again later." : message;
          break;
      }
    }

    return {
      success: false,
      status,
      code,
      message,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      raw: responseData,
    };
  }

  // Handle standard JavaScript Error
  if (error instanceof Error) {
    return {
      success: false,
      status: (error as any).statusCode || 500,
      code: (error as any).code || "INTERNAL_ERROR",
      message: error.message || fallbackMessage,
      raw: error,
    };
  }

  // Handle string error
  if (typeof error === "string") {
    return {
      success: false,
      status: 500,
      code: "ERROR",
      message: error,
    };
  }

  return {
    success: false,
    status: 500,
    code: "UNKNOWN_ERROR",
    message: fallbackMessage,
    raw: error,
  };
}
