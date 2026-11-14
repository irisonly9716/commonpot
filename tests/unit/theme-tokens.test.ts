import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/theme.css"), "utf8");

// Tailwind reads max-w-*, w-* and similar sizes from these names, so a
// --spacing-<name> token with one of them silently changes those classes.
const tailwindSizeKeys = [
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "prose",
];

describe("theme tokens exported from DESIGN.md", () => {
  it("has spacing tokens that do not reuse a Tailwind size name", () => {
    const names = [...css.matchAll(/--spacing-([\w-]+)\s*:/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    const clashes = names.filter(
      (n) => tailwindSizeKeys.includes(n) || n.startsWith("screen"),
    );
    expect(clashes).toEqual([]);
  });
});
