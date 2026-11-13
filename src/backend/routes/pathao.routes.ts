// TODO(stub): not implemented
import { Router, Request, Response } from "express";

const router = Router();

router.all("*", (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Pathao integration routes are not implemented yet.",
    },
  });
});

export default router;
