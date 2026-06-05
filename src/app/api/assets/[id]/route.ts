import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { assetSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth("assets:read");
    const { id } = await context.params;

    const asset = await prisma.asset.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        alerts: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(asset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("assets:write");
    const { id } = await context.params;
    const body = assetSchema.partial().parse(await request.json());
    const meta = getClientMeta(request);

    const existing = await prisma.asset.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        status: body.status,
        serialNumber: body.serialNumber,
        ipAddress: body.ipAddress,
        hostname: body.hostname,
        operatingSystem: body.operatingSystem,
        ownerId: body.ownerId,
        healthScore: body.healthScore,
        metadata: body.metadata ? asJson(body.metadata) : undefined,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
        documentationUrl: body.documentationUrl || undefined,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "asset.update",
      resource: "asset",
      resourceId: id,
      ...meta,
    });

    return Response.json(asset);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("assets:delete");
    const { id } = await context.params;
    const meta = getClientMeta(request);

    const existing = await prisma.asset.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    await prisma.asset.delete({ where: { id } });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "asset.delete",
      resource: "asset",
      resourceId: id,
      ...meta,
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
