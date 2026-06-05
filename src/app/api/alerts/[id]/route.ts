import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { asJson } from "@/lib/prisma-json";

type RouteContext = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["acknowledge", "suppress", "resolve", "escalate"]),
  suppressMinutes: z.number().int().min(1).max(10080).optional(),
});

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth("alerts:read");
    const { id } = await context.params;

    const alert = await prisma.alert.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        asset: true,
        history: { orderBy: { createdAt: "desc" } },
        acknowledgedBy: { select: { id: true, name: true } },
      },
    });

    if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(alert);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("alerts:write");
    const { id } = await context.params;
    const body = actionSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const existing = await prisma.alert.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};
    switch (body.action) {
      case "acknowledge":
        updates.status = "ACKNOWLEDGED";
        updates.acknowledgedById = user.id;
        updates.acknowledgedAt = new Date();
        break;
      case "suppress":
        updates.status = "SUPPRESSED";
        updates.suppressedUntil = new Date(
          Date.now() + (body.suppressMinutes ?? 60) * 60 * 1000,
        );
        break;
      case "resolve":
        updates.status = "RESOLVED";
        updates.resolvedAt = new Date();
        break;
      case "escalate":
        updates.status = "ESCALATED";
        break;
    }

    const alert = await prisma.alert.update({ where: { id }, data: updates });

    await prisma.alertHistory.create({
      data: {
        alertId: id,
        action: body.action,
        details: asJson(body),
        actorId: user.id,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: `alert.${body.action}`,
      resource: "alert",
      resourceId: id,
      ...meta,
    });

    return Response.json(alert);
  } catch (error) {
    return handleApiError(error);
  }
}
