// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const palette = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
].join("|");
const tailwindColor = new RegExp(
  `\\b(?:text|bg|border|ring|outline|fill|stroke|divide|accent|decoration)-(?:(?:${palette})-\\d{2,3}|black|white)\\b`,
  "g",
);
const hexColor = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const tailwindFontSize = /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g;

function offenders(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(pattern)].map(
      (match) => `${relative(root, file)}: ${match[0]}`,
    ),
  );
}

const allSource = sourceFiles(join(root, "src")).filter(
  (file) => !file.endsWith("database.types.ts"),
);

// The pages #39 restyles: sign-in, sign-up, expenses and balances.
const restyled = [
  "src/components/auth",
  "src/components/expenses",
  "src/components/balances",
  "src/app/sign-in",
  "src/app/sign-up",
  "src/app/groups/[groupId]/expenses",
  "src/app/groups/[groupId]/balances",
].flatMap((dir) => sourceFiles(join(root, dir)));

describe("#39 pages use the DESIGN.md tokens", () => {
  it("uses theme colors, never Tailwind's palette or hex values", () => {
    expect(offenders(allSource, tailwindColor)).toEqual([]);
    expect(offenders(allSource, hexColor)).toEqual([]);
  });

  it("uses the DESIGN.md type scale on the restyled pages", () => {
    expect(restyled.length).toBeGreaterThan(0);
    expect(offenders(restyled, tailwindFontSize)).toEqual([]);
  });
});
