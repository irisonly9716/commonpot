import { formatMoney } from "@/lib/format-money";

type Row = { label: string; amountCents: number; detail?: string };

type ChartTableProps = {
  caption: string;
  firstColumn: string;
  rows: Row[];
  currency: string;
  /** Shown as a last row when set, so the numbers can be checked by adding. */
  totalCents?: number;
};

/** The same numbers as a chart, as a table for screen readers and keyboards. */
export function ChartTable({
  caption,
  firstColumn,
  rows,
  currency,
  totalCents,
}: ChartTableProps) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="text-muted pb-2 text-left text-sm">{caption}</caption>
      <thead>
        <tr className="border-line border-b">
          <th scope="col" className="py-2 font-semibold">
            {firstColumn}
          </th>
          <th scope="col" className="py-2 text-right font-semibold">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-line border-b">
            <th scope="row" className="py-2 font-normal">
              {row.label}
              {row.detail ? (
                <span className="text-muted"> · {row.detail}</span>
              ) : null}
            </th>
            <td className="py-2 text-right">
              {formatMoney(row.amountCents, currency)}
            </td>
          </tr>
        ))}
      </tbody>
      {totalCents === undefined ? null : (
        <tfoot>
          <tr>
            <th scope="row" className="py-2">
              Total
            </th>
            <td className="py-2 text-right font-semibold">
              {formatMoney(totalCents, currency)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
