"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  CURRENCIES,
  createGroupSchema,
  type CreateGroupInput,
  type CreateGroupValues,
} from "@/lib/validation/groups";

export function CreateGroupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput, unknown, CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", currency: "USD" },
  });

  async function onSubmit(values: CreateGroupValues) {
    setFormError(null);
    const response = await fetch("/api/v1/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setFormError(
        "We couldn't create the group. Check the details and try again.",
      );
      return;
    }
    const group = (await response.json()) as { id: string };
    router.push(`/groups/${group.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <h2 className="text-lg font-semibold">Create a group</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Group name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("name")}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-red-800">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="currency" className="text-sm font-medium">
          Currency
        </label>
        <select
          id="currency"
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("currency")}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {formError && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 rounded bg-black px-4 text-white disabled:opacity-60"
      >
        Create group
      </button>
    </form>
  );
}
