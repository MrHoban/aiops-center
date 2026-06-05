import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { alertSchema, paginationSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("alerts:read");
    const params = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const severity = request.nextUrl.searchParams.get("severity");
    const status = request.nextUrl.searchParams.get("status");

    const where = {
      organizationId: user.organizationId,
      ...(severity ? { severity: severity as never } : {}),
      ...(status ? { status: status as never } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true } },
          acknowledgedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.alert.count({ where }),
    ]);

    return Response.json({ items, total, page: params.page, limit: params.limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("alerts:write");
    const body = alertSchema.parse(await request.json());
    const meta = getClientMeta(request);

    let correlationId = body.correlationId;
    if (!correlationId && body.assetId) {
      const related = await prisma.alert.findFirst({
        where: {
          organizationId: user.organizationId,
          assetId: body.assetId,
          severity: body.severity,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (related?.correlationId) correlationId = related.correlationId;
      else if (related) correlationId = related.id;
    }

    const alert = await prisma.alert.create({
      data: {
        title: body.title,
        description: body.description,
        severity: body.severity,
        source: body.source,
        assetId: body.assetId,
        metadata: body.metadata ? asJson(body.metadata) : undefined,
        organizationId: user.organizationId,
        createdById: user.id,
        correlationId: correlationId ?? undefined,
      },
      include: { asset: { select: { id: true, name: true } } },
    });

    await prisma.alertHistory.create({
      data: {
        alertId: alert.id,
        action: "created",
        details: { source: body.source },
        actorId: user.id,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "alert.create",
      resource: "alert",
      resourceId: alert.id,
      ...meta,
    });

    return Response.json(alert, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
