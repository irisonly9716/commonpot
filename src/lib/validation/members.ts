import { z } from "zod";

const categoryName = z
  .string()
  .trim()
  .min(1, "Enter a category name.")
  .max(50, "Use 50 characters or fewer.");

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const createCategorySchema = z.object({ name: categoryName });

export const updateCategorySchema = z
  .object({ name: categoryName.optional(), isArchived: z.boolean().optional() })
  .refine(
    (value) => value.name !== undefined || value.isArchived !== undefined,
    {
      message: "Send a name or isArchived.",
    },
  );
