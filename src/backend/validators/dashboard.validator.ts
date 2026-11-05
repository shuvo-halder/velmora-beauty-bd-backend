import { z } from "zod";

export const dashboardQuerySchema = z.object({
  range: z.enum([
    "today",
    "yesterday",
    "7d",
    "30d",
    "this_month",
    "last_month",
    "this_year",
    "custom"
  ]).optional().default("30d"),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
}).refine((data) => {
  if (data.from && data.to) {
    const fromDate = new Date(data.from);
    const toDate = new Date(data.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return false;
    }
    return fromDate <= toDate;
  }
  return true;
}, {
  message: "'from' date must be earlier than or equal to 'to' date and both must be valid ISO date strings",
  path: ["from"],
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
