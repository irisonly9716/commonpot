import { describe, expect, it } from "vitest";

import { GET as getSpec } from "@/app/api/docs/openapi.yaml/route";

describe("US13 connect other tools: the API documentation is public", () => {
  it("serves openapi.yaml without a token", async () => {
    const response = await getSpec(
      new Request("http://localhost/api/docs/openapi.yaml"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("yaml");
    const text = await response.text();
    expect(text.startsWith("openapi: 3.1.0")).toBe(true);
    expect(text).toContain("/api/v1/auth/token");
  });
});
