"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/format-money";

export type ChartPoint = {
  label: string;
  amountCents: number;
  /** The current month in the trend gets the accent color. */
  highlight?: boolean;
};

type SpendingChartProps = {
  /** Bars grow upward for months, and sideways for categories. */
  direction: "columns" | "rows";
  points: ChartPoint[];
  currency: string;
  /** Read out by screen readers; the table view has the full numbers. */
  description: string;
};

const PRIMARY = "var(--color-primary)";
const ACCENT = "var(--color-accent)";
const INK = "var(--color-ink)";
const MUTED = "var(--color-muted)";

/**
 * One bar chart for both views. It is a picture only: the table view holds the
 * same numbers as real text, so the chart is described as a single image.
 */
export function SpendingChart({
  direction,
  points,
  currency,
  description,
}: SpendingChartProps) {
  const height =
    direction === "columns" ? 220 : Math.max(points.length, 1) * 44;
  const money = (value: unknown) => formatMoney(Number(value), currency);

  return (
    <div role="img" aria-label={description} style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height }}
      >
        <BarChart
          data={points}
          layout={direction === "columns" ? "horizontal" : "vertical"}
          margin={{ top: 24, right: direction === "rows" ? 72 : 8, left: 8 }}
          accessibilityLayer={false}
        >
          {direction === "columns" ? (
            <>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: MUTED, fontSize: 14 }}
              />
              <YAxis type="number" hide />
            </>
          ) : (
            <>
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tickLine={false}
                axisLine={false}
                tick={{ fill: INK, fontSize: 14 }}
              />
              <XAxis type="number" hide />
            </>
          )}
          <Bar
            dataKey="amountCents"
            radius={3}
            isAnimationActive={false}
            maxBarSize={direction === "rows" ? 16 : 56}
          >
            {points.map((point) => (
              <Cell
                key={point.label}
                fill={point.highlight ? ACCENT : PRIMARY}
              />
            ))}
            <LabelList
              dataKey="amountCents"
              position={direction === "columns" ? "top" : "right"}
              formatter={money}
              fill={INK}
              fontSize={14}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
