import { SignOutButton } from "../../components/auth/sign-out-button";

export default function GroupsPage() {
  // TODO(#7): list the user's groups, add "Create a group" and the invite link.
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Your groups</h1>
      <p>You are not in a group yet.</p>
      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
