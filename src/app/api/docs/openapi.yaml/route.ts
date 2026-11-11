import { readFile } from "node:fs/promises";
import path from "node:path";

// Built once at build time, so the deployment does not need docs/ at runtime.
export const dynamic = "force-static";

/** The API description that Swagger UI at /api/docs loads. Public, no token. */
export async function GET(): Promise<Response> {
  const file = path.join(process.cwd(), "docs/api/openapi.yaml");
  return new Response(await readFile(file, "utf8"), {
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
