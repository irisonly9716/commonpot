import type {
  CurrencySpending,
  SpendingBreakdown,
} from "@/lib/domain/personal-spending";
import { formatMoney } from "@/lib/format-money";

const shortMonth = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function monthShort(month: string): string {
  return shortMonth.format(new Date(`${month}-01T00:00:00Z`));
}

/**
 * A bar that shows a share of the whole. It is decoration only: the row next
 * to it has the amount and the percentage as text, so it is hidden from
 * screen readers and color is never the only signal.
 */
function Bar({ percent }: { percent: number }) {
  return (
    <span
      aria-hidden="true"
      className="bg-track mt-1 block h-2 w-full rounded-sm"
    >
      <span
        className="bg-primary block h-2 rounded-sm"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </span>
  );
}

function BreakdownTable({
  caption,
  heading,
  rows,
  currency,
}: {
  caption: string;
  heading: string;
  rows: SpendingBreakdown[];
  currency: string;
}) {
  return (
    <table className="w-full border-collapse">
      <caption className="text-label text-left font-semibold">
        {caption}
      </caption>
      <thead>
        <tr className="text-label text-muted text-left">
          <th scope="col">{heading}</th>
          <th className="text-right" scope="col">
            Amount
          </th>
          <th className="text-right" scope="col">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className="border-line border-t" key={row.key}>
            <th className="py-2 pr-2 text-left font-normal" scope="row">
              {row.label}
              <Bar percent={row.percent} />
            </th>
            <td className="py-2 text-right">
              {formatMoney(row.amountCents, currency)}
            </td>
            <td className="py-2 text-right">{row.percent}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One currency's totals: the month, by category, by source and the 6-month trend (US10). */
export function SpendingTables({
  spending,
  monthLabel,
  showCurrency,
}: {
  spending: CurrencySpending;
  monthLabel: string;
  showCurrency: boolean;
}) {
  const { currency } = spending;
  const suffix = showCurrency ? ` (${currency})` : "";
  const busiest = Math.max(0, ...spending.trend.map((m) => m.amountCents));

  return (
    <section className="flex flex-col gap-4">
      <p className="text-body">
        Total in {monthLabel}
        {suffix}: <strong>{formatMoney(spending.totalCents, currency)}</strong>
      </p>

      {spending.byCategory.length === 0 ? (
        <p className="text-muted">Nothing spent in {monthLabel}.</p>
      ) : (
        <>
          <BreakdownTable
            caption={`By category${suffix}`}
            currency={currency}
            heading="Category"
            rows={spending.byCategory}
          />
          <BreakdownTable
            caption={`By source${suffix}`}
            currency={currency}
            heading="Source"
            rows={spending.bySource}
          />
        </>
      )}

      <table className="w-full border-collapse">
        <caption className="text-label text-left font-semibold">
          {`Last 6 months${suffix}`}
        </caption>
        <thead>
          <tr className="text-label text-muted text-left">
            <th scope="col">Month</th>
            <th className="text-right" scope="col">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {spending.trend.map((entry) => (
            <tr className="border-line border-t" key={entry.month}>
              <th className="py-2 pr-2 text-left font-normal" scope="row">
                {monthShort(entry.month)}
                <Bar
                  percent={
                    busiest === 0 ? 0 : (entry.amountCents * 100) / busiest
                  }
                />
              </th>
              <td className="py-2 text-right">
                {formatMoney(entry.amountCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
