import { SignUpForm } from "../../components/auth/sign-up-form";
import { safeRedirectPath } from "../../lib/auth/safe-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SignUpForm next={safeRedirectPath(next)} />;
}
