import { apiError } from "@/lib/api/errors";
import {
  hasJsonBody,
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { paymentCreateSchema } from "@/lib/validation/payments";

export async function POST(request: Request, context: GroupRouteContext) {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  if (!hasJsonBody(request)) {
    return apiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
      415,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON", 422);
  }

  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const payment = parsed.data;
  if (![payment.paidBy, payment.paidTo].includes(access.user.id)) {
    return apiError(
      "FORBIDDEN",
      "You can only record a payment you made or received",
      403,
    );
  }

  const { data, error } = await access.supabase
    .from("payments")
    .insert({
      group_id: access.groupId,
      paid_by: payment.paidBy,
      paid_to: payment.paidTo,
      amount_cents: payment.amountCents,
      payment_date: payment.paymentDate,
      note: payment.note,
    })
    .select("id")
    .single();

  if (error) {
    // 42501: row-level security refused it. P0001: a trigger rejected it, for
    // example a payer or payee outside the group.
    if (error.code === "42501") {
      return apiError(
        "FORBIDDEN",
        "You can only record a payment you made or received",
        403,
      );
    }
    if (error.code === "P0001") {
      return apiError("INVALID_PAYMENT", error.message, 422);
    }
    return apiError("DATABASE_ERROR", "Could not record the payment", 500);
  }

  return Response.json({ id: data.id }, { status: 201 });
}
