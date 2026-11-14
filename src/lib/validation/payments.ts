import { z } from "zod";

const differentPeople = {
  message: "Choose two different people",
  path: ["paidTo"],
};

export const paymentCreateSchema = z
  .object({
    paidBy: z.uuid(),
    paidTo: z.uuid(),
    amountCents: z.number().int().positive(),
    paymentDate: z.iso.date(),
    note: z
      .string()
      .trim()
      .max(200, "Note must be 200 characters or fewer")
      .default(""),
  })
  .refine((payment) => payment.paidBy !== payment.paidTo, differentPeople);

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;

export const paymentFormSchema = z
  .object({
    paidBy: z.uuid(),
    paidTo: z.uuid(),
    amount: z
      .string()
      .trim()
      .refine(
        (value) =>
          /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value) && Number(value) > 0,
        "Enter an amount greater than $0 with at most 2 decimals",
      ),
    paymentDate: z.iso.date(),
  })
  .refine((payment) => payment.paidBy !== payment.paidTo, differentPeople);

export type PaymentFormInput = z.infer<typeof paymentFormSchema>;
