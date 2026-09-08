import { z } from "zod";

export const reportPeriodSchema = z.enum(["30", "90", "365", "all"]);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export function parseReportPeriod(value: unknown): ReportPeriod {
  return reportPeriodSchema.catch("30").parse(value);
}

