"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signInErrorMessage } from "@/lib/auth/messages";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";
import {
  signInSchema,
  type SignInInput,
  type SignInValues,
} from "@/lib/validation/auth";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput, unknown, SignInValues>({
    resolver: zodResolver(signInSchema),
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError(signInErrorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
    >
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-800">
            Enter a valid email address.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-red-800">
            {errors.password.message}
          </p>
        )}
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
        Sign in
      </button>

      <p className="text-sm">
        New here?{" "}
        <Link
          href={`/sign-up?next=${encodeURIComponent(next)}`}
          className="underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
