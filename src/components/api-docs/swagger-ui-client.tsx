"use client";

import Script from "next/script";

import "swagger-ui-react/swagger-ui.css";

type SwaggerUIBundle = (config: { url: string; dom_id: string }) => unknown;

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerUIBundle;
  }
}

/**
 * Swagger UI from the prebuilt script served at /api/docs/swagger-ui-bundle.js.
 * `onReady` runs once the script has loaded, and again if this page is opened
 * a second time without a reload.
 */
export function SwaggerUiClient() {
  return (
    <>
      <div id="swagger-ui" />
      <Script
        src="/api/docs/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onReady={() => {
          window.SwaggerUIBundle?.({
            url: "/api/docs/openapi.yaml",
            dom_id: "#swagger-ui",
          });
        }}
      />
    </>
  );
}
