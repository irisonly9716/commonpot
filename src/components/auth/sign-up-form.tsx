"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createSupabaseBrowserClient } from "../../lib/db/supabase-browser";
import {
  signUpSchema,
  type SignUpInput,
  type SignUpValues,
} from "../../lib/validation/auth";

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
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm">
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
      <h1 className="text-2xl font-semibold">Create your account</h1>

      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={
            errors.displayName ? "displayName-error" : undefined
          }
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("displayName")}
        />
        {errors.displayName && (
          <p id="displayName-error" className="text-sm text-red-800">
            {errors.displayName.message}
          </p>
        )}
      </div>

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
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-help"
          className="min-h-11 rounded border border-gray-400 px-3"
          {...register("password")}
        />
        <p
          id="password-help"
          className={`text-sm ${errors.password ? "text-red-800" : "text-gray-700"}`}
        >
          {errors.password?.message ?? "Use at least 8 characters."}
        </p>
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
        Create account
      </button>

      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
