// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");
const constraintWords = new Set([
  "primary",
  "unique",
  "check",
  "constraint",
  "foreign",
  "exclude",
]);

type Tables = Map<string, Set<string>>;

/** Tables and their columns after every migration has run, in file order. */
function tablesFromMigrations(): Tables {
  const tables: Tables = new Map();
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8").replace(
      /--.*$/gm,
      "",
    );
    for (const match of sql.matchAll(
      /create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g,
    )) {
      const columns = new Set<string>();
      for (const line of match[2].split("\n")) {
        // Column definitions are indented two spaces; continuation lines more.
        const word = /^ {2}([a-z_]+)\s/.exec(line)?.[1];
        if (word && !constraintWords.has(word)) columns.add(word);
      }
      tables.set(match[1], columns);
    }
    for (const match of sql.matchAll(
      /alter table (?:only )?public\.(\w+)\s+add column (?:if not exists )?(\w+)/g,
    )) {
      tables.get(match[1])?.add(match[2]);
    }
    for (const match of sql.matchAll(
      /alter table (?:only )?public\.(\w+)\s+drop column (?:if exists )?(\w+)/g,
    )) {
      tables.get(match[1])?.delete(match[2]);
    }
    for (const match of sql.matchAll(
      /drop table (?:if exists )?public\.(\w+)/g,
    )) {
      tables.delete(match[1]);
    }
  }
  return tables;
}

/** Entities and attribute names from the erDiagram block in docs/database.md. */
function tablesFromDiagram(): Tables {
  const path = join(root, "docs/database.md");
  const markdown = existsSync(path) ? readFileSync(path, "utf8") : "";
  const block = /```mermaid\n(erDiagram[\s\S]*?)```/.exec(markdown)?.[1] ?? "";
  const tables: Tables = new Map();
  for (const match of block.matchAll(/^\s*(\w+)\s*\{\n([\s\S]*?)^\s*\}/gm)) {
    const columns = match[2]
      .split("\n")
      .map((line) => line.trim().split(/\s+/)[1])
      .filter((name): name is string => Boolean(name));
    tables.set(match[1], new Set(columns));
  }
  return tables;
}

const sorted = (values: Iterable<string>) => [...values].sort();

const fromMigrations = tablesFromMigrations();
const fromDiagram = tablesFromDiagram();

describe("#19 the database diagram matches the migrations", () => {
  it("reads the tables from the migrations", () => {
    expect(fromMigrations.size).toBeGreaterThan(0);
    expect(sorted(fromMigrations.get("expenses") ?? [])).toContain(
      "amount_cents",
    );
  });

  it("draws every table, and only those", () => {
    expect(sorted(fromDiagram.keys())).toEqual(sorted(fromMigrations.keys()));
  });

  it.each(sorted(fromMigrations.keys()))(
    "draws every column of %s",
    (table) => {
      expect(sorted(fromDiagram.get(table) ?? [])).toEqual(
        sorted(fromMigrations.get(table) ?? []),
      );
    },
  );
});

const docs = [
  "README.md",
  "docs/setup.md",
  "docs/architecture.md",
  "docs/database.md",
  "docs/contributions.md",
];

describe("#19 the docs link to files that exist", () => {
  it.each(docs)("%s exists and its relative links work", (doc) => {
    const path = join(root, doc);
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, "utf8");
    const broken = [...text.matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => match[1])
      .filter((target) => !/^(https?:|mailto:|#)/.test(target))
      .map((target) => decodeURI(target.split("#")[0]))
      .filter((target) => !existsSync(resolve(root, dirname(doc), target)));
    expect(broken).toEqual([]);
  });
});
