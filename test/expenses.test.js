import test from "node:test";
import assert from "node:assert/strict";
import { addExpense, ExpenseValidationError } from "../src/expenses.js";

function group() {
  return {
    members: [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
      { id: "carol", name: "Carol" },
    ],
    expenses: [],
  };
}

test("a group member can add an equal expense", () => {
  const currentGroup = group();

  const expense = addExpense(currentGroup, {
    id: "expense-1",
    description: "Dinner",
    amount: "10.00",
    payerId: "alice",
    splitType: "equal",
  });

  assert.deepEqual(expense.shares, { alice: 334, bob: 333, carol: 333 });
  assert.equal(expense.amountCents, 1000);
  assert.equal(currentGroup.expenses[0], expense);
});

test("an equal split can target selected group members", () => {
  const expense = addExpense(group(), {
    amount: "9",
    payerId: "bob",
    memberIds: ["bob", "carol"],
    splitType: "equal",
  });

  assert.deepEqual(expense.shares, { bob: 450, carol: 450 });
});

test("a group member can add an exact split", () => {
  const currentGroup = group();

  const expense = addExpense(currentGroup, {
    description: "Groceries",
    amount: "23.50",
    payerId: "carol",
    splitType: "exact",
    amounts: { alice: "10.00", bob: 5.5, carol: "8.00" },
  });

  assert.deepEqual(expense.shares, { alice: 1000, bob: 550, carol: 800 });
});

test("rejects an expense added by a non-member", () => {
  assert.throws(
    () => addExpense(group(), { amount: "5", payerId: "stranger" }),
    (error) => error instanceof ExpenseValidationError && error.code === "UNKNOWN_MEMBER",
  );
});

test("rejects exact splits that do not total the expense", () => {
  assert.throws(
    () =>
      addExpense(group(), {
        amount: "10",
        payerId: "alice",
        splitType: "exact",
        amounts: { alice: 2, bob: 3, carol: 4 },
      }),
    (error) => error instanceof ExpenseValidationError && error.code === "INVALID_SPLIT",
  );
});

test("rejects unknown split members and invalid precision", () => {
  assert.throws(
    () =>
      addExpense(group(), {
        amount: "1.001",
        payerId: "alice",
      }),
    (error) => error instanceof ExpenseValidationError && error.code === "INVALID_AMOUNT",
  );
  assert.throws(
    () =>
      addExpense(group(), {
        amount: "5",
        payerId: "alice",
        memberIds: ["alice", "nobody"],
      }),
    (error) => error instanceof ExpenseValidationError && error.code === "UNKNOWN_MEMBER",
  );
});
