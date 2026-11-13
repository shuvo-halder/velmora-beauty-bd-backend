// TODO(stub): not implemented
import { z } from "zod";

export const assignProductFaqSchema = z.object({
  faqId: z.string().uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export const reorderProductFaqsSchema = z.object({
  faqIds: z.array(z.string().uuid()).optional(),
});
