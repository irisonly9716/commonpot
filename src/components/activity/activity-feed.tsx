import type { ActivityItem } from "@/lib/data/activity";
import { formatMoney } from "@/lib/format-money";

type ActivityFeedProps = {
  items: ActivityItem[];
  currency: string;
  currentUserId: string;
};

const verbs: Record<string, string> = {
  added: "added",
  edited: "edited",
  deleted: "deleted",
  payment_recorded: "recorded a payment:",
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function describe(item: ActivityItem, currentUserId: string): string {
  const actor = item.actorId === currentUserId ? "You" : item.actorName;
  const verb = verbs[item.action] ?? item.action;
  return `${actor} ${verb} ${item.description}`;
}

/** The group's activity, newest first: who added, edited or deleted what. */
export function ActivityFeed({
  items,
  currency,
  currentUserId,
}: ActivityFeedProps) {
  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading">Activity</h2>
      {/* Live updates (US4) are announced to screen readers. */}
      <div aria-live="polite">
        {items.length === 0 ? (
          <p>No activity yet.</p>
        ) : (
          <ol>
            {items.map((item) => (
              <li key={item.id}>
                <span>
                  {describe(item, currentUserId)}
                  {item.amountCents !== null &&
                    ` · ${formatMoney(item.amountCents, currency)}`}
                </span>{" "}
                {/* Server and browser time zones can differ, so the text may change on hydration. */}
                <time dateTime={item.createdAt} suppressHydrationWarning>
                  {timeFormat.format(new Date(item.createdAt))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
