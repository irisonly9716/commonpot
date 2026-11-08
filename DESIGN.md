---
version: alpha
name: CommonPot
description: A calm, plain-spoken design for shared household money. Warm paper background, one teal for trust and structure, one clay accent for the main action.
colors:
  paper: "#F6F4EF"
  surface: "#FFFFFF"
  ink: "#1F2A37"
  muted: "#5D6673"
  line: "#DEDAD2"
  track: "#ECE9E2"
  primary: "#0F5C5A"
  primary-soft: "#E3EFED"
  on-primary: "#FFFFFF"
  accent: "#B5481C"
  on-accent: "#FFFFFF"
  owed: "#0F5C5A"
  owes: "#9B2C2C"
  warn: "#8A5A00"
  disabled: "#E4E0D8"
  on-disabled: "#565E6A"
typography:
  display:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 1.625rem
    fontWeight: 650
    lineHeight: 1.2
  title:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 1.25rem
    fontWeight: 650
    lineHeight: 1.25
  amount-input:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 1.75rem
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.4
  body-strong:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.3
  eyebrow:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.04em
  caption:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.78rem
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: 3px
  md: 6px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
components:
  screen:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  section:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: 16px
  caption-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.on-disabled}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 12px
  divider:
    backgroundColor: "{colors.line}"
    height: 1px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  input-invalid:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.owes}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  segmented-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 44px
  segmented-control-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 44px
  avatar:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: 28px
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    height: 64px
  bottom-nav-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    height: 64px
  balance-owed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.owed}"
    typography: "{typography.body-strong}"
  balance-owes:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.owes}"
    typography: "{typography.body-strong}"
  budget-bar-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.sm}"
    height: 8px
  budget-bar-fill:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    height: 8px
  budget-bar-fill-warn:
    backgroundColor: "{colors.warn}"
    rounded: "{rounded.sm}"
    height: 8px
---

## Overview

CommonPot is where a household keeps shared money honest. It should feel like a tidy paper ledger on a kitchen table: calm, plain-spoken and a little warm, never like a banking app or a game. People open it standing in a doorway to answer one question, "do I owe anyone, or does anyone owe me?", so the answer comes first and everything else follows.

Three ideas drive every screen:

- **The number first, in words.** What you owe or are owed is the first thing on the home screen, written as a sentence ("You are owed +$42.50") and never shown by color alone.
- **Quiet by default, loud only for the next step.** Almost everything is ink on white or paper. One clay button per screen says what to do next.
- **Never moves money.** CommonPot records who paid whom. Screens that record a payment say so plainly.

The mockups in `docs/design/` (group home, add expense, settle up, insights) are the source of truth for layout. This file is the source of truth for colors, type and spacing.

## Colors

The palette is a warm paper neutral, one deep teal, one clay accent, and two status colors. Every text and background pair below was checked against WCAG 2.1 AA (4.5:1 for text).

- **Paper (#F6F4EF):** the page background, softer than pure white.
- **Surface (#FFFFFF):** sections, cards, form fields and the bottom navigation.
- **Ink (#1F2A37):** headings and body text, 14.5:1 on surface.
- **Muted (#5D6673):** captions, labels and secondary text, 5.3:1 on paper and 5.8:1 on surface. Do not use anything lighter for text.
- **Line (#DEDAD2):** 1px dividers between sections and rows (the `divider` component).
- **Track (#ECE9E2):** the empty part of a budget bar.
- **Primary (#0F5C5A):** deep teal for structure and trust: links, selected controls, the progress of a healthy budget and the avatar text. 7.8:1 on surface.
- **Primary soft (#E3EFED):** a pale teal behind avatars.
- **Accent (#B5481C):** clay, used only for the single main action on a screen ("Add expense", "Save expense") and for the current month in a chart. White text on it is 5.4:1.
- **Owed (#0F5C5A):** an amount that someone owes you. Always paired with a plus sign and the words "owes you" or "you are owed".
- **Owes (#9B2C2C):** an amount that you owe, and error text. Always paired with a minus sign or the words "you owe". 7.5:1 on surface.
- **Warn (#8A5A00):** a budget past its 80% alert. Always paired with the words "Past the 80% alert". 5.9:1 on surface.
- **Disabled (#E4E0D8) and on-disabled (#565E6A):** a button that cannot be used yet, such as Save while an exact split is $4.00 short. The text is 5.0:1 on its background, so it stays readable, and the reason the button is off is always written next to it.

Color never carries meaning alone: owed and owes use signs and words, and budget states use words.

## Typography

One system font stack (`system-ui`) keeps the app fast and native on phones and laptops. Hierarchy comes from size and weight, not from decorative fonts.

- **Display (26px, 650):** the one headline on the home screen ("You are owed +$42.50").
- **Title (20px, 650):** screen titles.
- **Amount input (28px, 650):** the amount field on Add expense, the largest thing on that screen.
- **Body (15px) and body strong (15px, 600):** rows, descriptions and names.
- **Label (13px, 600):** form labels, always visible above the field, never a placeholder.
- **Eyebrow (13px, 600, uppercase, 0.04em tracking):** section headings such as "Your balance" and "Budgets this month".
- **Caption (12.5px):** helper text, timestamps and the "Balances add up to $0.00" note. Never smaller.

Money is formatted for display only, with `Intl.NumberFormat`, and always shows two decimals (`$84.21`). Numbers in tables and bars use the same font so columns line up.

## Layout

Mobile first. Design at 390px wide, one column, then add a second column from 1024px.

- **Gutter:** 20px on each side of every screen (`spacing.xl`).
- **Spacing scale:** 4, 8, 12, 16, 20, 24px. Rows use 8 to 14px of vertical padding, sections use 16px, and there is 10px of paper between sections.
- **Tap targets:** at least 44px high for every button, link-button, field, segment and nav item. Nav is 64px tall.
- **Order on the home screen:** balance, then budgets, then live activity. The floating "Add expense" button sits above the bottom navigation, bottom right.
- **Forms:** one field per row, labels above, errors directly under the field and linked with `aria-describedby`. Category and Date may share a row.

## Elevation & Depth

CommonPot is flat. Depth comes from the paper-and-surface contrast and 1px lines, not from shadows. Do not add drop shadows, glows or blurs. The floating "Add expense" button is the only element that sits above the page, and it separates itself with its solid accent color.

## Shapes

Corners are small and consistent: 6px on buttons, fields and segmented controls, 3px on bars, and a full circle for avatars. Do not use larger radii on cards or sections. Sections are full-width white bands with a 1px bottom line, not floating rounded cards.

## Components

Components are tokens in the front matter. They map to the components named in AGENTS.md:

- **`BalanceSummary`:** the display headline, then one row per person ("Alex owes you +$28.00") using `balance-owed` or `balance-owes`, then "Settle up" as a `button-secondary`.
- **`BudgetBar`:** category name and "$336 of $400" on one row, a `budget-bar-track` with `budget-bar-fill` (or `budget-bar-fill-warn` past 80%), and a line of words below: "Past the 80% alert · 84% used · $64 left".
- **`ActivityFeed`:** rows of one sentence and a relative time, newest first, with a small "Live" label. Updates are announced with `aria-live="polite"`.
- **`ExpenseForm` and `SplitEditor`:** `input` fields, a `segmented-control` for Equally or Exact amounts, a member checklist with each share, and the leftover-cent explanation. An exact split shows "$4.00 left to assign" in `owes`, and Save uses the disabled colors until it is $0.00.
- **`SettleUpList` and `PaymentForm`:** one block per suggested payment with the amount in `owed`, a sentence about the resulting balance, and "Record payment" as a `button-secondary`. A note says CommonPot never moves money.
- **`SpendingChart` and `ChartTable`:** bars for categories and a six-month trend, a Me and Group `segmented-control`, a month picker, and a Chart and Table `segmented-control`. The table shows the same numbers as the chart.
- **`AlertToast` and `ConnectionStatus`:** a short sentence on `surface` with a 1px `line` border. Budget alerts use `warn` text and the words, never color alone.
- **Bottom navigation:** Home, Expenses, Insights, My spending, with the current tab in `primary` and bold.

## Do's and Don'ts

**Do**

- Put what the person owes or is owed first, in words and with a sign.
- Use `accent` for exactly one primary action per screen.
- Show every state: loading, empty, error, disabled, and the reason a button is disabled.
- Give every chart a table view with the same numbers.
- Keep a visible 2px `primary` focus ring with a 2px offset on every interactive element.

**Don't**

- Don't use color alone to show owed, owes or budget state.
- Don't use colored side stripes on cards, rows of three identical cards, gradients, glows or drop shadows.
- Don't use corner radii above 6px, or round the sections into floating cards.
- Don't hard-code colors or font sizes. Use the tokens in this file through the Tailwind theme.
- Don't use text lighter than `muted`, text smaller than 12.5px, or tap targets smaller than 44px.
- Don't suggest that CommonPot sends or holds money.
