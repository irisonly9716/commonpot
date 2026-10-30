# Group expenses

The expense domain is implemented in [`src/expenses.js`](./src/expenses.js).
`addExpense(group, input)` allows a group member to record an expense and split
it among all group members (the default) or a selected subset.

Amounts are supplied as decimal strings or numbers and stored as integer cents.
Use `splitType: "equal"` for an equal split, or `splitType: "exact"` with an
`amounts` object keyed by member ID. Exact amounts must include every
participating member and add up to the expense total.

Run the tests with:

```sh
npm test
```
