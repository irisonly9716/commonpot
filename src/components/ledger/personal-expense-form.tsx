"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import type { PersonalExpense } from "@/lib/data/personal";
import { parseAmountToCents } from "@/lib/domain/expenses";
import { getLocalDateString } from "@/lib/local-date";
import {
  personalExpenseFormSchema,
  type PersonalExpenseFormInput,
} from "@/lib/validation/personal";

function centsToAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

type PersonalExpenseFormProps = {
  /** The expense to edit; without one the form adds a new expense. */
  expense: PersonalExpense | null;
  /** Category names to suggest. */
  categories: string[];
  onSaved: () => void;
  onCancel: () => void;
};

const inputClass = "min-h-11 rounded-sm border border-line bg-surface px-3";

export function PersonalExpenseForm({
  expense,
  categories,
  onSaved,
  onCancel,
}: PersonalExpenseFormProps) {
  const isEdit = expense !== null;
  const id = useId();
  const headingId = `${id}-heading`;
  const listId = `${id}-categories`;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PersonalExpenseFormInput>({
    resolver: zodResolver(personalExpenseFormSchema),
    defaultValues: expense
      ? {
          amount: centsToAmount(expense.amountCents),
          description: expense.description,
          category: expense.category,
          expenseDate: expense.expenseDate,
        }
      : {
          amount: "",
          description: "",
          category: "",
          expenseDate: getLocalDateString(),
        },
  });

  async function save(values: PersonalExpenseFormInput) {
    setSubmitError(null);
    const body = {
      amountCents: parseAmountToCents(values.amount.trim()),
      description: values.description.trim(),
      category: values.category.trim(),
      expenseDate: values.expenseDate,
    };
    const response = await fetch(
      expense
        ? `/api/v1/personal-expenses/${expense.id}`
        : "/api/v1/personal-expenses",
      {
        method: expense ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ).catch(() => null);

    if (!response?.ok) {
      setSubmitError("Could not save the expense. Try again.");
      return;
    }
    if (!isEdit) {
      reset({
        amount: "",
        description: "",
        category: "",
        expenseDate: getLocalDateString(),
      });
    }
    onSaved();
  }

  const field = (name: keyof PersonalExpenseFormInput) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const error = (name: keyof PersonalExpenseFormInput) =>
    errors[name] && (
      <p className="text-label text-owes" id={`${id}-${name}-error`}>
        {errors[name]?.message}
      </p>
    );

  return (
    <form
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
      noValidate
      onSubmit={handleSubmit(save)}
    >
      <h2 className="text-title font-semibold" id={headingId}>
        {isEdit ? "Edit personal expense" : "Add a personal expense"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-label font-semibold">Amount</span>
        <input
          className={inputClass}
          inputMode="decimal"
          {...field("amount")}
          {...register("amount")}
        />
      </label>
      {error("amount")}

      <label className="flex flex-col gap-1">
        <span className="text-label font-semibold">Description</span>
        <input
          className={inputClass}
          maxLength={200}
          {...field("description")}
          {...register("description")}
        />
      </label>
      {error("description")}

      <label className="flex flex-col gap-1">
        <span className="text-label font-semibold">Category</span>
        <input
          className={inputClass}
          list={listId}
          maxLength={50}
          {...field("category")}
          {...register("category")}
        />
      </label>
      <datalist id={listId}>
        {categories.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {error("category")}

      <label className="flex flex-col gap-1">
        <span className="text-label font-semibold">Date</span>
        <input
          className={inputClass}
          type="date"
          {...field("expenseDate")}
          {...register("expenseDate")}
        />
      </label>
      {error("expenseDate")}

      {submitError && (
        <p className="text-owes" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          className="bg-primary text-on-primary min-h-11 rounded-sm px-4 font-semibold disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isEdit ? "Save changes" : "Add expense"}
        </button>
        {isEdit && (
          <button
            className="border-line min-h-11 rounded-sm border px-4"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
