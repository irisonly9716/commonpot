"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";
import {
  signUpSchema,
  type SignUpInput,
  type SignUpValues,
} from "@/lib/validation/auth";

const SIGN_UP_ERROR =
  "We couldn't create your account. Check your details, or sign in if you already have one.";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput, unknown, SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpValues) {
    setFormError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { display_name: values.displayName } },
    });
    if (error) {
      setFormError(SIGN_UP_ERROR);
      return;
    }
    if (!data.session) {
      // The project requires email confirmation before the first sign-in.
      setCheckEmail(true);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div className="mx-auto w-full max-w-sm p-6" role="status">
        <h1>Check your email</h1>
        <p className="text-label mt-2">
          We sent a link to confirm your address. After you confirm it, you can
          sign in.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6"
    >
      <h1>Create your account</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={
            errors.displayName ? "displayName-error" : undefined
          }
          className="border-muted min-h-11 rounded border px-3"
          {...register("displayName")}
        />
        {errors.displayName && (
          <p id="displayName-error" className="text-label text-owes">
            {errors.displayName.message}
          </p>
        )}
      </div>

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
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-help"
          className="border-muted min-h-11 rounded border px-3"
          {...register("password")}
        />
        <p
          id="password-help"
          className={`text-label ${errors.password ? "text-owes" : "text-muted"}`}
        >
          {errors.password?.message ?? "Use at least 8 characters."}
        </p>
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
        Create account
      </button>

      <p className="text-label">
        Already have an account?{" "}
        <Link
          href={`/sign-in?next=${encodeURIComponent(next)}`}
          className="underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
