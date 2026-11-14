import { apiError } from "@/lib/api/errors";
import { hasJsonBody } from "@/lib/api/group-access";

export type JsonBody =
  { ok: true; body: unknown } | { ok: false; response: Response };

/** Reads a JSON request body: 415 for another content type, 422 for bad JSON. */
export async function readJsonBody(request: Request): Promise<JsonBody> {
  if (!hasJsonBody(request)) {
    return {
      ok: false,
      response: apiError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type must be application/json",
        415,
      ),
    };
  }

  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: apiError(
        "VALIDATION_ERROR",
        "Request body must be valid JSON",
        422,
      ),
    };
  }
}
