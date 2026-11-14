import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// The routes that anyone may call without a token.
const PUBLIC_ROUTES = new Set(["/api/v1/auth/token"]);
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const uuid = "00000000-0000-4000-8000-000000000000";

const root = process.cwd();
const apiDir = path.join(root, "src/app/api/v1");

/** Every route.ts under src/app/api/v1 with its URL path and exported methods. */
function findRoutes(): Array<{ url: string; file: string; methods: string[] }> {
  const found: Array<{ url: string; file: string; methods: string[] }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const source = fs.readFileSync(full, "utf8");
        const methods = METHODS.filter((method) =>
          new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(
            source,
          ),
        );
        const relative = path
          .relative(path.join(root, "src/app"), path.dirname(full))
          .split(path.sep)
          .map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}"))
          .join("/");
        found.push({ url: `/${relative}`, file: full, methods: [...methods] });
      }
    }
  };
  walk(apiDir);
  return found.sort((a, b) => a.url.localeCompare(b.url));
}

/** "path method" pairs from docs/api/openapi.yaml, read from its indentation. */
function documentedOperations(): { operations: string[]; lines: string[] } {
  const lines = fs
    .readFileSync(path.join(root, "docs/api/openapi.yaml"), "utf8")
    .split("\n");
  const operations: string[] = [];
  let inPaths = false;
  let current = "";
  for (const line of lines) {
    if (/^paths:/.test(line)) inPaths = true;
    else if (/^\S/.test(line)) inPaths = false;
    if (!inPaths) continue;
    const pathMatch = /^  (\/\S+):\s*$/.exec(line);
    if (pathMatch) current = pathMatch[1];
    const methodMatch = /^    (get|post|put|patch|delete):\s*$/.exec(line);
    if (methodMatch && current) {
      operations.push(`${methodMatch[1].toUpperCase()} ${current}`);
    }
  }
  return { operations: operations.sort(), lines };
}

describe("US13 connect other tools: the API matches its documentation", () => {
  it("documents every endpoint, and documents nothing that does not exist", () => {
    const code = findRoutes()
      .flatMap((route) =>
        route.methods.map((method) => `${method} ${route.url}`),
      )
      .sort();
    expect(code.length).toBeGreaterThan(0);
    expect(documentedOperations().operations).toEqual(code);
  });

  it("documents every error response with the shared ApiError shape", () => {
    const { lines } = documentedOperations();
    const problems: string[] = [];
    lines.forEach((line, index) => {
      if (!/^        "[45]\d\d":/.test(line)) return;
      // The next few lines must point at ApiError, directly or through a shared response.
      const following = lines.slice(index + 1, index + 12).join("\n");
      const sharedResponse =
        /^          \$ref: "#\/components\/responses\//.test(
          lines[index + 1] ?? "",
        );
      if (
        !sharedResponse &&
        !following.includes("#/components/schemas/ApiError")
      ) {
        problems.push(`${index + 1}: ${line.trim()}`);
      }
    });
    expect(problems).toEqual([]);
  });

  it("answers 401 in the shared shape on every endpoint when there is no token", async () => {
    const routes = findRoutes().filter(
      (route) => !PUBLIC_ROUTES.has(route.url),
    );
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const params = Object.fromEntries(
        [...route.url.matchAll(/\{(\w+)\}/g)].map((match) => [match[1], uuid]),
      );
      const url = route.url.replace(/\{(\w+)\}/g, uuid);
      const routeModule = (await import(
        /* @vite-ignore */ route.file
      )) as Record<
        string,
        (request: Request, context: unknown) => Promise<Response>
      >;
      for (const method of route.methods) {
        const response = await routeModule[method](
          new Request(`http://localhost${url}`, { method }),
          { params: Promise.resolve(params) },
        );
        const label = `${method} ${route.url}`;
        expect(response.status, label).toBe(401);
        expect(await response.json(), label).toEqual({
          error: { code: "UNAUTHORIZED", message: expect.any(String) },
        });
      }
    }
  });
});
