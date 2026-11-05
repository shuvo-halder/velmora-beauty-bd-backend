import { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger";

export const storefrontRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const responseTime = Math.round(diff[0] * 1000 + diff[1] / 1e6); // in ms

    logger.info("Storefront Request", {
      service: "storefront",
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip || req.socket?.remoteAddress || "",
      userAgent: req.get("user-agent") || "",
    });
  });

  next();
};
