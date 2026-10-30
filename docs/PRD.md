# PRD — CommonPot: Shared Accounts for Households and Groups

Draft v0.2 · Oct 29, 2026 · Arianna

## 1. Overview

CommonPot is a web app where a household, a set of roommates or any small group keeps one shared expense account. Members log what they spend and who it was for, the app splits each cost and keeps everyone's balance, changes appear on every member's screen in real time, and the group admin sets monthly budgets that warn the group before it overspends. Each user also keeps a private personal ledger that adds up their own expenses and their shares from every group. CommonPot records payments between members but never moves real money.

## 2. Problem

People who live or travel together share many costs: rent, utilities, internet, groceries, a weekend trip. Most groups track them in a group chat, in a spreadsheet one person maintains, or from memory. This breaks down in predictable ways:

- **Records are scattered.** Receipts are in the chat, totals are in a spreadsheet, and some costs are never written down.
- **One person does all the bookkeeping.** The person who set up the spreadsheet ends up entering everyone's costs and chasing payments.
- **Nobody knows the current balance.** Who owes whom is worked out only at the end of the month, and settling up turns into an argument about what was counted.
- **Budgets are checked too late.** A shared limit such as "$400 a month for groceries" is noticed only after the group has gone over it.
- **Changes are invisible.** When someone adds or edits an expense, the others don't find out until the numbers stop matching.
- **No one sees their own total.** Someone who shares costs with roommates and with a trip group, and also pays for things alone, has no single place that shows what they spent this month.

## 3. Target users and roles

**Personas**

- **Roommates** sharing rent, utilities and groceries, often students or young professionals. One of them usually ends up keeping the spreadsheet.
- **Couples and families** running a household budget together who want to see where the money goes each month.
- **Friend groups** sharing costs for a trip or an event, for a few weeks at a time.

**Roles**

| Role | Who | Can do |
| --- | --- | --- |
| Member | Anyone who joined a group | Log expenses; edit or delete their own; see balances, budgets and charts; record payments; leave the group; keep a private personal ledger |
| Group admin | The group's creator and members they promote | Everything a member can, plus invite and remove members, change roles, delete any expense in the group, set budgets and categories |
| Site admin | The platform operator | See users and groups with counts only (no amounts or expense details), suspend and reactivate accounts, manage the default category list |

Permissions are enforced on the server (API checks and database row-level security), not only by hiding buttons. A personal ledger is visible only to its owner.

## 4. Goals and success metrics

**Goal:** a group always agrees on what was spent, who owes whom and how close it is to its budgets, without one person doing the bookkeeping, and each person knows what they spend in total each month.

| Metric | Target | How we measure it |
| --- | --- | --- |
| New users who create a group, invite someone and log a split expense without help | ≥ 4 of 5, each in ≤ 3 min | Usability test with 5 target users |
| Time for a new expense to appear on another member's screen | ≤ 2 s | Playwright E2E test with two browser sessions |
| Groups whose member balances add up to exactly zero | 100% | Unit and integration tests on the balance logic |
| Public API endpoints described in the OpenAPI spec | 100% | Spec lint and a contract test in CI |
| Line coverage of business logic (splits, balances, budgets, personal totals) | ≥ 80% | Vitest coverage report in CI |
| Accessibility of the main pages | Lighthouse ≥ 90, no critical axe violations | Lighthouse and axe checks in CI |

## 5. User stories and acceptance criteria

Priorities use MoSCoW.

- **Must:** US1 Sign in safely · US2 Start a shared account · US3 Log and split an expense · US4 See changes live · US5 Know who owes whom · US6 Fix mistakes · US10 My personal ledger · US13 Connect other tools
- **Should:** US7 Budgets with early warnings · US8 See where the money goes · US11 Manage the group · US12 Keep the platform healthy
- **Could:** US9 See each member's share

### US1 — Sign in safely (Must)

> As a new user, I want to create an account and sign in securely, so that my groups and spending are visible only to me and the people I share them with.

- I can sign up and sign in with email and password, and sign out on this device.
- A failed sign-in shows one general error that doesn't reveal whether the email exists.
- A signed-out visitor who opens any app page is sent to the sign-in page and returned to that page after signing in.
- API requests without a valid token get `401 Unauthorized`.

### US2 — Start a shared account and bring people in (Must)

> As the person who organizes my household's bills, I want to create a shared account and invite my roommates or family with a link, so that everyone records shared costs in the same place.

- I can create a group with a name and a currency, and I become its admin.
- I can create an invite link that expires after 7 days, and an admin can revoke it at any time.
- Someone who opens a valid link and signs in joins as a member; opening it again doesn't add them twice.
- An expired or revoked link shows a clear message instead of an error page.
- Every member can see the member list with each person's role.

### US3 — Log and split an expense (Must)

> As a roommate who just paid for groceries, I want to record what I paid and who it was for, so that the cost is shared fairly without doing the math in a chat.

- I enter amount, description, category, date, who paid (default: me) and who shares it (default: everyone).
- I can split equally (default) or by exact amounts. Exact amounts must add up to the total, or the form explains the difference and won't save.
- The amount must be greater than 0 with at most 2 decimals, and the date and description are required. Each error appears next to its field.
- In an equal split, leftover cents go to members one cent at a time so the shares add up exactly to the total.
- The new expense appears at the top of the group's list as soon as it is saved.

### US4 — See changes as they happen (Must)

> As a member of a busy household, I want new and edited expenses to show up on my screen without refreshing, so that I always see the same numbers as everyone else.

- When another member adds, edits or deletes an expense or records a payment, my list, balances and budgets update within 2 seconds without a reload.
- A group activity feed shows who did what and when, e.g. "Jay added Groceries · $84.20".
- If the connection drops, the page shows "Reconnecting…" and catches up when it is back, with no duplicates or missing items.

### US5 — Know who owes whom (Must)

> As a roommate at the end of the month, I want to see who owes whom and how much, so that we can settle up without arguing over the numbers.

- Each member's balance (paid minus owed) is shown with words as well as color: "owes $12.50" or "is owed $30.00".
- All balances in a group add up to exactly zero.
- A "Settle up" view suggests payments that clear all balances, using at most one fewer payment than the number of members with a non-zero balance.
- I can record a payment ("I paid Jay $40"), and both balances update right away. The app records the payment but moves no money.
- I can open any member's balance and see the expenses and payments behind it.

### US6 — Fix mistakes (Must)

> As a member who mistyped an amount, I want to edit or delete an expense I logged, so that the account stays accurate.

- I can edit or delete expenses I logged. No one else can edit them.
- A group admin can delete any expense in the group, whether it is split among several members or belongs to one member.
- When an admin deletes an expense someone else logged, that person gets an in-app alert saying who deleted it and what it was.
- Members don't see edit or delete controls they aren't allowed to use, and the API returns `403 Forbidden` if they try.
- Deleting asks for confirmation.
- Every edit and delete appears in the activity feed with who made it, and balances and budgets recalculate.

### US7 — Budgets with early warnings (Should)

> As the person who keeps our household within budget, I want to set a monthly limit for categories like groceries or dining out and be warned before we go over, so that we can adjust before the month ends.

- A group admin can set, change or remove a monthly budget for any category; every member can see the budgets.
- Each budget shows spent and limit for the current month with a progress bar and the amount left.
- When spending reaches 80% and then 100% of a limit, every member gets an in-app alert in real time, once per threshold per month.
- Budgets start over on the first day of each month, and past months stay viewable.

### US8 — See where the money goes (Should)

> As a member, I want to see my own monthly spending and the group's total spending, each with charts, so that I know what I spend and which shared costs are growing.

- "My spending" counts my share of each expense, not the amount I paid up front.
- An insights page has two views, Me and Group, for any month I choose: the total, a chart by category, and a chart of the last 6 months.
- Chart totals match the expense list for the same month.
- Each chart has a table view with the same numbers for screen-reader and keyboard users.

### US9 — See each member's share (Could)

> As a member, I want to see how much each member's share came to this month, so that the whole group can see how its spending is divided.

- The Group view shows each member's share for the selected month, as a chart and as a table.
- Every member of the group can see it.

### US10 — My personal ledger (Must)

> As someone who shares costs with several groups and also pays for things alone, I want one private place that adds up everything I spend, so that I know what I really spend each month.

- Every user has a private personal ledger that no one else can see, including group admins and site admins.
- I can log, edit and delete personal expenses there with amount, description, category and date.
- My share of every expense in my groups is added automatically, so I never enter it twice.
- A "My spending" page shows my total for any month I choose, by category and by source (each group and personal), with charts and a 6-month trend.
- The totals match the sum of my personal expenses and my shares in each group for the same month.

### US11 — Manage the group (Should)

> As a group admin, I want to manage members, roles and categories, so that the account stays organized when people move in or out.

- An admin can promote a member to admin, remove a member, and add, rename or archive categories.
- Removing a member whose balance isn't zero shows the balance and requires confirmation.
- A group always has at least one admin: the last admin can't leave or step down without promoting someone first.
- A member can leave a group when their balance is zero.

### US12 — Keep the platform healthy (Should)

> As the site administrator, I want to see platform activity and suspend abusive accounts, so that the service stays safe and usable.

- A site admin dashboard lists users and groups with sign-up dates and counts (members, expenses), but no amounts or expense details.
- A site admin can suspend and reactivate a user; a suspended user can't sign in or call the API.
- A site admin can edit the default category list that new groups start with.
- Anyone else who opens the dashboard or its API gets `403 Forbidden`.

### US13 — Connect other tools through the API (Must)

> As a developer or power user, I want to read and add expenses through a documented REST API, so that I can connect CommonPot to other tools, such as a script that imports a bank export.

- A versioned REST API under `/api/v1` covers groups, members, expenses, payments, balances, budgets and the personal ledger.
- I get a token by signing in through the API and send it as `Authorization: Bearer <token>`; I can only reach my own ledger and the groups I belong to.
- Interactive OpenAPI (Swagger) docs at `/api/docs` show every endpoint with example requests and responses.
- Every error uses the same JSON shape with a status code and a readable message.

## 6. UI/UX requirements

- **Main screens:** sign in and sign up; group home (balances, budget bars, activity feed and an "Add expense" button); expense list with filters; add and edit expense; settle up; insights (Me and Group views); group settings (members, invites, categories, budgets); my spending (personal ledger and totals across groups); site admin dashboard.
- **Group home is the focus:** a member should see what they owe or are owed and the latest activity without scrolling.
- **Mobile first:** people log expenses on their phones right after paying. One column on phones, two columns from 1024 px.
- **Numbers are clear:** amounts align and use the group's currency format; owes and is-owed use words and +/− signs, not color alone.
- **Accessible:** WCAG 2.1 AA, full keyboard use, visible focus, labels on every form field, contrast at least 4.5:1.
- **Look and feel:** follows `DESIGN.md` (colors, type, spacing) and the mockups in `docs/design/`.

## 7. Technical requirements

| Area | Requirement |
| --- | --- |
| Stack | Next.js (App Router) + TypeScript + Tailwind CSS; Supabase (PostgreSQL, Auth, Realtime); deployed on Vercel. Latest stable versions, checked before each install. |
| Auth | Supabase Auth with email and password; JWT access tokens for the web app and the public API. |
| Real time | Supabase Realtime on expenses, payments and in-app alerts (budgets and deletions), filtered to the groups a user belongs to. |
| Data | Schema changes only through migration files, plus a seed script that every developer and CI use. Money is stored as integer cents. Balances and personal totals are calculated from expenses and payments, not stored by hand. |
| Security | Row-level security on every table; server-side permission checks in every API route; input validated on the server; secrets only in environment variables (`.env.example` lists names only); `npm audit` and CodeQL in CI. |
| API | REST under `/api/v1`, documented in `docs/api/openapi.yaml` and served at `/api/docs`. |
| Testing | TDD: a failing test is committed before each implementation. Unit and integration tests with Vitest, E2E with Playwright, including a two-user real-time test. |
| CI/CD | GitHub Actions on every PR: lint and format → unit and integration tests → build → E2E, plus a security scan job. A preview deploy for every PR, production deploys from `main`, and separate environment variables for development, preview and production. |

## 8. Out of scope (v1)

- Moving real money, linking bank accounts or processing payments
- Splitting by percentage or by shares (splits are equal or exact amounts)
- Repeating bills
- Exporting expenses to CSV
- Scanning receipts
- Converting between currencies (each group uses one currency)
- Invitations by email (invites use links)
- Sign-in with Google or other providers
- Personal API keys (the API uses sign-in tokens)
- Native mobile apps (the responsive web app covers phones)
- Email or push notifications (alerts are in-app only)
- AI features
