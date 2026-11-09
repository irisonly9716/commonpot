"use client";

import { useState } from "react";

import type { NamedBalance } from "@/lib/data/balances";
import type { BreakdownItem, Settlement } from "@/lib/domain/balances";
import { formatMoney } from "@/lib/format-money";
import { PaymentForm, type PaymentDraft } from "./payment-form";

type Member = { id: string; displayName: string };

type BalancesViewProps = {
  groupId: string;
  currentUserId: string;
  currency: string;
  members: Member[];
  balances: NamedBalance[];
  settlements: Settlement[];
  breakdowns: Record<string, BreakdownItem[]>;
};

/** "+$42.50", "−$28.00" or "$0.00": the sign carries meaning, not only color. */
function signedMoney(cents: number, currency: string): string {
  const amount = formatMoney(Math.abs(cents), currency);
  if (cents > 0) return `+${amount}`;
  if (cents < 0) return `−${amount}`;
  return amount;
}

function balanceWords(balance: NamedBalance, isYou: boolean): string {
  if (isYou) {
    if (balance.status === "owed") return "You are owed";
    if (balance.status === "owes") return "You owe";
    return "You are settled up";
  }
  if (balance.status === "owed") return `${balance.displayName} is owed`;
  if (balance.status === "owes") return `${balance.displayName} owes`;
  return `${balance.displayName} is settled up`;
}

export function BalancesView({
  groupId,
  currentUserId,
  currency,
  members,
  balances,
  settlements,
  breakdowns,
}: BalancesViewProps) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);

  const nameOf = (userId: string, capitalize: boolean) => {
    if (userId === currentUserId) return capitalize ? "You" : "you";
    return (
      balances.find((balance) => balance.userId === userId)?.displayName ??
      "Former member"
    );
  };
  const total = balances.reduce((sum, b) => sum + b.balanceCents, 0);

  return (
    <main>
      <nav aria-label="Group pages">
        <a href={`/groups/${groupId}/expenses`}>Expenses</a>
      </nav>

      <section aria-labelledby="balances-heading">
        <h1 id="balances-heading">Balances</h1>
        <ul>
          {balances.map((balance) => {
            const isOpen = openUserId === balance.userId;
            const items = breakdowns[balance.userId] ?? [];
            return (
              <li key={balance.userId}>
                <button
                  aria-controls={`breakdown-${balance.userId}`}
                  aria-expanded={isOpen}
                  onClick={() => setOpenUserId(isOpen ? null : balance.userId)}
                  type="button"
                >
                  <span>
                    {balanceWords(balance, balance.userId === currentUserId)}
                  </span>{" "}
                  <span>{signedMoney(balance.balanceCents, currency)}</span>
                </button>
                {isOpen && (
                  <ul id={`breakdown-${balance.userId}`}>
                    {items.length === 0 && <li>Nothing yet.</li>}
                    {items.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <span>{item.description}</span>{" "}
                        <time dateTime={item.date}>{item.date}</time>{" "}
                        <span>{signedMoney(item.effectCents, currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <p>Balances add up to {formatMoney(total, currency)}</p>
      </section>

      <section aria-labelledby="settle-up-heading">
        <h2 id="settle-up-heading">Settle up</h2>
        {settlements.length === 0 ? (
          <p>Everyone is settled up.</p>
        ) : (
          <ul>
            {settlements.map((settlement) => {
              const involvesYou = [
                settlement.fromUserId,
                settlement.toUserId,
              ].includes(currentUserId);
              const verb =
                settlement.fromUserId === currentUserId ? "pay" : "pays";
              return (
                <li key={`${settlement.fromUserId}-${settlement.toUserId}`}>
                  <span>
                    {`${nameOf(settlement.fromUserId, true)} ${verb} ${nameOf(
                      settlement.toUserId,
                      false,
                    )} ${formatMoney(settlement.amountCents, currency)}`}
                  </span>
                  {involvesYou && (
                    <button
                      onClick={() =>
                        setDraft({
                          paidBy: settlement.fromUserId,
                          paidTo: settlement.toUserId,
                          amountCents: settlement.amountCents,
                        })
                      }
                      type="button"
                    >
                      Record this payment
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PaymentForm
        currentUserId={currentUserId}
        draft={draft}
        groupId={groupId}
        members={members}
      />
    </main>
  );
}
