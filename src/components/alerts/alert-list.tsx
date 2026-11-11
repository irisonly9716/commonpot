"use client";

import { useState } from "react";

import type { AlertItem } from "@/lib/data/alerts";

type AlertListProps = {
  alerts: AlertItem[];
};

/** My unread in-app alerts, for example "Alex deleted your expense: Pizza". */
export function AlertList({ alerts: initialAlerts }: AlertListProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState<string | null>(null);

  async function markRead(alertId: string) {
    setError(null);
    const response = await fetch(`/api/v1/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ read: true }),
    }).catch(() => null);

    if (!response?.ok) {
      setError("Could not mark the alert as read.");
      return;
    }
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
  }

  if (alerts.length === 0 && !error) return null;

  return (
    <section aria-labelledby="alerts-heading">
      <h2 id="alerts-heading">Alerts</h2>
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id}>
            <span>{alert.message}</span>{" "}
            <button onClick={() => markRead(alert.id)} type="button">
              Mark as read
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
