import { describe, expect, it } from "vitest";

import { GET as getBundle } from "@/app/api/docs/swagger-ui-bundle.js/route";
import { GET as getSpec } from "@/app/api/docs/openapi.yaml/route";

describe("US13 connect other tools: the API documentation is public", () => {
  it("serves openapi.yaml without a token", async () => {
    const response = await getSpec();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("yaml");
    const text = await response.text();
    expect(text.startsWith("openapi: 3.1.0")).toBe(true);
    expect(text).toContain("/api/v1/auth/token");
  });

  it("serves the prebuilt Swagger UI script from this site", async () => {
    const response = await getBundle();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("javascript");
    const text = await response.text();
    expect(text).toContain("SwaggerUIBundle");
    expect(text.length).toBeGreaterThan(100_000);
  });
});
