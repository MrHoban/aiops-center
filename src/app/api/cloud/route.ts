import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { cloudResourceSchema, paginationSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("cloud:read");
    const params = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const provider = request.nextUrl.searchParams.get("provider");

    const where = {
      organizationId: user.organizationId,
      ...(provider ? { provider: provider as never } : {}),
    };

    const [items, total, costSummary] = await Promise.all([
      prisma.cloudResource.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.cloudResource.count({ where }),
      prisma.cloudResource.groupBy({
        by: ["provider"],
        where: { organizationId: user.organizationId },
        _sum: { monthlyCost: true },
        _count: true,
      }),
    ]);

    const securityFindings = items.reduce((acc, r) => {
      const findings = Array.isArray(r.securityFindings) ? r.securityFindings : [];
      return acc + findings.length;
    }, 0);

    return Response.json({
      items,
      total,
      page: params.page,
      limit: params.limit,
      costSummary,
      securityFindingsCount: securityFindings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("cloud:write");
    const body = cloudResourceSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const resource = await prisma.cloudResource.upsert({
      where: {
        organizationId_provider_resourceId: {
          organizationId: user.organizationId,
          provider: body.provider,
          resourceId: body.resourceId,
        },
      },
      create: {
        provider: body.provider,
        resourceId: body.resourceId,
        name: body.name,
        resourceType: body.resourceType,
        region: body.region,
        status: body.status ?? "unknown",
        monthlyCost: body.monthlyCost,
        securityFindings: asJson(body.securityFindings ?? []),
        metadata: body.metadata ? asJson(body.metadata) : undefined,
        organizationId: user.organizationId,
        lastSyncedAt: new Date(),
      },
      update: {
        name: body.name,
        resourceType: body.resourceType,
        region: body.region,
        status: body.status,
        monthlyCost: body.monthlyCost,
        securityFindings: asJson(body.securityFindings ?? []),
        metadata: body.metadata ? asJson(body.metadata) : undefined,
        lastSyncedAt: new Date(),
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "cloud.sync",
      resource: "cloud_resource",
      resourceId: resource.id,
      ...meta,
    });

    return Response.json(resource, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
