import { z } from "zod";

/** A calendar month as `YYYY-MM`, like `2026-10`. */
export const insightsMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-10");
