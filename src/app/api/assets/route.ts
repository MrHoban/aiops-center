import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { assetSchema, paginationSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("assets:read");
    const params = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const type = request.nextUrl.searchParams.get("type");

    const where = {
      organizationId: user.organizationId,
      ...(type ? { type: type as never } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              { hostname: { contains: params.search, mode: "insensitive" as const } },
              { ipAddress: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.asset.count({ where }),
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
    const user = await requireAuth("assets:write");
    const body = assetSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const asset = await prisma.asset.create({
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
        organizationId: user.organizationId,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
        documentationUrl: body.documentationUrl || undefined,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "asset.create",
      resource: "asset",
      resourceId: asset.id,
      ...meta,
    });

    return Response.json(asset, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
