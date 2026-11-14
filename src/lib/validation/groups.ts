import { z } from "zod";

// Only currencies with two decimals, because every amount is stored in cents.
// JPY has no minor unit, so it would be shown wrong.
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"] as const;

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a group name.")
    .max(60, "Use 60 characters or fewer."),
  currency: z.enum(CURRENCIES),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1).max(200),
});

export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type CreateGroupValues = z.output<typeof createGroupSchema>;
