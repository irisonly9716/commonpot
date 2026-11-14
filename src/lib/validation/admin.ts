import { z } from "zod";

const categoryName = z
  .string()
  .trim()
  .min(1, "Enter a category name")
  .max(50, "Use 50 characters or fewer");

export const suspendUserSchema = z.object({ suspended: z.boolean() });

export const createDefaultCategorySchema = z.object({ name: categoryName });

export const updateDefaultCategorySchema = z
  .object({ name: categoryName.optional(), isArchived: z.boolean().optional() })
  .refine(
    (value) => value.name !== undefined || value.isArchived !== undefined,
    {
      message: "Send a name or isArchived",
    },
  );
