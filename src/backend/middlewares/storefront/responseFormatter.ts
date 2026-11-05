import { Request, Response, NextFunction } from "express";

export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function (body: any) {
    if (!body) {
      return originalJson.call(this, body);
    }

    // Skip special Google Merchant feeds to prevent ingestion failure
    if (req.originalUrl.includes("/merchant/feed") || req.originalUrl.includes("/merchant")) {
      return originalJson.call(this, body);
    }

    // Check if it's already explicitly formatted
    const hasStatusAndMsg = body && typeof body === "object" && "status" in body && "message" in body;
    if (hasStatusAndMsg) {
      if (body.status === "success") {
        return originalJson.call(this, {
          status: "success",
          message: body.message ?? "",
          data: body.data ?? {},
          pagination: body.pagination ?? body.meta ?? {}
        });
      } else if (body.status === "error") {
        return originalJson.call(this, {
          status: "error",
          message: body.message ?? "",
          errors: body.errors ?? []
        });
      }
    }

    // Determine if this is an error payload (based on statusCode or payload properties)
    const isError = res.statusCode >= 400 || body.success === false || body.status === "error";

    if (isError) {
      const message = body.message || "An error occurred";
      const errors = body.errors || body.details || [];
      return originalJson.call(this, {
        status: "error",
        message,
        errors: Array.isArray(errors) ? errors : [errors]
      });
    }

    // Format Success responses
    let data: any = {};
    let pagination: any = {};
    const message = body.message || "";

    // Extract pagination properties
    if (body.pagination) {
      pagination = body.pagination;
    } else if (body.meta) {
      pagination = body.meta;
    }

    // Determine appropriate data block
    if ("data" in body) {
      data = body.data;
    } else {
      const { success, status, message: bodyMsg, meta, pagination: bodyPag, ...rest } = body;
      data = rest;
    }

    // If there are other top-level properties (e.g., ga4 payloads)
    const { success, status, message: bodyMsg, meta, pagination: bodyPag, data: bodyData, ...rest } = body;
    if (Object.keys(rest).length > 0) {
      if (typeof data === "object" && data !== null && !Array.isArray(data)) {
        data = { ...data, ...rest };
      } else {
        data = { items: data, ...rest };
      }
    }

    return originalJson.call(this, {
      status: "success",
      message,
      data,
      pagination
    });
  };

  next();
};
