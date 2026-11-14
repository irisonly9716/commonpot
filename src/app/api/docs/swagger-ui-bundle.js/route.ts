import { readFile } from "node:fs/promises";
import path from "node:path";

// Built once at build time, so the deployment does not need node_modules at runtime.
export const dynamic = "force-static";

/**
 * The prebuilt Swagger UI script that ships inside swagger-ui-react. We serve it
 * as is and load it with a script tag. Importing swagger-ui-react through the
 * app's bundler breaks its OpenAPI 3.1 support ("refract is not a function"),
 * and the prebuilt bundle does not have that problem.
 */
export async function GET(): Promise<Response> {
  const file = path.join(
    process.cwd(),
    "node_modules/swagger-ui-react/swagger-ui-bundle.js",
  );
  return new Response(await readFile(file, "utf8"), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
