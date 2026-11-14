// @vitest-environment node
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const script = join(process.cwd(), ".github/scripts/keep-alive.sh");
const secretKey = "test-anon-key-do-not-print";

type Seen = { url?: string; apikey?: string; authorization?: string };
let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

async function startServer(status: number, seen: Seen = {}) {
  server = createServer((request, response) => {
    seen.url = request.url;
    seen.apikey = request.headers.apikey as string | undefined;
    seen.authorization = request.headers.authorization;
    response.writeHead(status, { "content-type": "application/json" });
    response.end("[]");
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

function run(env: Record<string, string>) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      PATH: process.env.PATH ?? "",
      ...env,
    };
    execFile(
      "bash",
      [script],
      { env: environment },
      (error, stdout, stderr) => {
        const code = error && typeof error.code === "number" ? error.code : 0;
        resolve({
          code: error && code === 0 ? 1 : code,
          output: stdout + stderr,
        });
      },
    );
  });
}

describe("keep-alive script (#49)", () => {
  it("sends one authenticated request to the REST API and succeeds on 200", async () => {
    const seen: Seen = {};
    const url = await startServer(200, seen);
    const { code, output } = await run({
      SUPABASE_URL: `${url}/`,
      SUPABASE_ANON_KEY: secretKey,
    });
    expect(code).toBe(0);
    expect(seen.url).toBe("/rest/v1/default_categories?select=id&limit=1");
    expect(seen.apikey).toBe(secretKey);
    expect(seen.authorization).toBe(`Bearer ${secretKey}`);
    expect(output).toContain("200");
  });

  it("fails with the status code when the API does not answer 2xx, without printing the key", async () => {
    const url = await startServer(401);
    const { code, output } = await run({
      SUPABASE_URL: url,
      SUPABASE_ANON_KEY: secretKey,
    });
    expect(code).toBe(1);
    expect(output).toContain("::error::");
    expect(output).toContain("401");
    expect(output).not.toContain(secretKey);
  });

  it("fails when the server cannot be reached", async () => {
    const { code, output } = await run({
      SUPABASE_URL: "http://127.0.0.1:1",
      SUPABASE_ANON_KEY: secretKey,
    });
    expect(code).toBe(1);
    expect(output).toContain("::error::");
    expect(output).not.toContain(secretKey);
  });

  it("warns and exits 0 while the secrets are not set yet", async () => {
    const { code, output } = await run({});
    expect(code).toBe(0);
    expect(output).toContain("::warning::");
  });

  it("warns when only one of the two values is set", async () => {
    const { code, output } = await run({ SUPABASE_URL: "http://127.0.0.1:1" });
    expect(code).toBe(0);
    expect(output).toContain("::warning::");
  });
});
