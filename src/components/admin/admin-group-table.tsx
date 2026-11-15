import type { AdminGroup } from "@/lib/data/admin";
import { formatDate } from "@/lib/format-date";

/** Groups with creation date and counts. Never any amounts or expense details. */
export function AdminGroupTable({ groups }: { groups: AdminGroup[] }) {
  if (groups.length === 0) return <p>No groups yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left">
        <caption className="text-muted pb-2 text-left text-sm">Groups</caption>
        <thead>
          <tr className="border-line border-b">
            <th scope="col" className="py-2 pr-4">
              Name
            </th>
            <th scope="col" className="py-2 pr-4">
              Created
            </th>
            <th scope="col" className="py-2 pr-4 text-right">
              Members
            </th>
            <th scope="col" className="py-2 text-right">
              Expenses
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="border-line border-b">
              <th scope="row" className="py-2 pr-4 font-semibold">
                {group.name}
              </th>
              <td className="py-2 pr-4">{formatDate(group.createdAt)}</td>
              <td className="py-2 pr-4 text-right">{group.memberCount}</td>
              <td className="py-2 text-right">{group.expenseCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
