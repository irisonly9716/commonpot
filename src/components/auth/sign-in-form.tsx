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
      <h1>Sign in</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="border-muted min-h-11 rounded border px-3"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-label text-owes">
            Enter a valid email address.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="border-muted min-h-11 rounded border px-3"
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-label text-owes">
            {errors.password.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-label text-owes">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent text-on-accent min-h-11 rounded px-4 disabled:opacity-60"
      >
        Sign in
      </button>

      <p className="text-label">
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
