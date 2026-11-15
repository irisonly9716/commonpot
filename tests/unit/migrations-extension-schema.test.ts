// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// pgcrypto lives in the "extensions" schema. The login role the Supabase CLI
// uses on the hosted project does not have that schema on its search path, so a
// bare call like gen_random_bytes(24) fails there with "function does not
// exist" (#52), even though it works on the local database.
const pgcryptoFunctions = [
  "gen_random_bytes",
  "gen_salt",
  "crypt",
  "digest",
  "hmac",
  "pgp_sym_encrypt",
  "pgp_sym_decrypt",
];

const dir = join(process.cwd(), "supabase/migrations");
const migrations = readdirSync(dir).filter((name) => name.endsWith(".sql"));

function withoutComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

describe("migrations run on hosted Supabase (#52)", () => {
  it("finds the migrations", () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it.each(migrations)(
    "%s calls pgcrypto functions with the extensions. prefix",
    (name) => {
      const sql = withoutComments(readFileSync(join(dir, name), "utf8"));
      const bare = pgcryptoFunctions.filter((fn) =>
        new RegExp(`(?<![\\w.])${fn}\\s*\\(`).test(sql),
      );
      expect(bare).toEqual([]);
    },
  );
});
