import { z } from "zod";

/** Body of POST /api/v1/auth/token. */
export const apiTokenRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});
