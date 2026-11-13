// TODO(stub): not implemented
import { Router, Request, Response } from "express";

const router = Router();

router.all("*", (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Archive subsystem is not implemented yet (scheduled for Phase 4).",
    },
  });
});

export default router;
