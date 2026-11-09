import { z } from "zod";

export const alertUpdateSchema = z.object({
  read: z.boolean({ error: "read must be true or false" }),
});

export const alertListQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
});

export type AlertUpdateInput = z.infer<typeof alertUpdateSchema>;
