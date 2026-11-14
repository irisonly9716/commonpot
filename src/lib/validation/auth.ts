import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email());

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(50, "Use 50 characters or fewer."),
  email,
  // Supabase hashes passwords with bcrypt, which only reads the first 72 bytes.
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use 72 characters or fewer."),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;
