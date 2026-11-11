import type { Metadata } from "next";

import { SwaggerUiClient } from "@/components/api-docs/swagger-ui-client";

export const metadata: Metadata = {
  title: "CommonPot API",
  description: "Documentation for the public CommonPot REST API",
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4">
      <SwaggerUiClient />
    </main>
  );
}
