import Link from "next/link";

export type GroupPage = "home" | "expenses" | "balances" | "insights";

const pages: { key: GroupPage; label: string; path: string }[] = [
  { key: "home", label: "Group home", path: "" },
  { key: "expenses", label: "Expenses", path: "/expenses" },
  { key: "balances", label: "Balances", path: "/balances" },
  { key: "insights", label: "Insights", path: "/insights" },
];

/**
 * The same links on every page of a group. The current page is marked with
 * `aria-current`, which screen readers announce and the styles show in bold.
 */
export function GroupNav({
  groupId,
  current,
}: {
  groupId: string;
  current: GroupPage;
}) {
  return (
    <nav aria-label="Group pages">
      <ul className="gap-x-space-5 flex flex-wrap">
        {pages.map((page) => (
          <li key={page.key}>
            <Link
              aria-current={page.key === current ? "page" : undefined}
              className="nav-link inline-flex min-h-11 items-center"
              href={`/groups/${groupId}${page.path}`}
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
