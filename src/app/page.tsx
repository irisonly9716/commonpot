import { redirect } from "next/navigation";

/**
 * The app starts at the groups list. A signed-out visitor never reaches this
 * page: the proxy sends them to sign-in first, and they come back here (#56).
 */
export default function Home(): never {
  redirect("/groups");
}
