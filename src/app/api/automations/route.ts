import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { automationSchema, paginationSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("automations:read");
    const params = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const where = { organizationId: user.organizationId };

    const [items, total] = await Promise.all([
      prisma.automation.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          runs: { take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.automation.count({ where }),
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
    const user = await requireAuth("automations:write");
    const body = automationSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const automation = await prisma.automation.create({
      data: {
        name: body.name,
        description: body.description,
        language: body.language,
        script: body.script,
        schedule: body.schedule,
        requiresApproval: body.requiresApproval,
        organizationId: user.organizationId,
        createdById: user.id,
        parameters: asJson(body.parameters ?? []),
      },
    });

    await prisma.automationVersion.create({
      data: {
        automationId: automation.id,
        version: 1,
        script: body.script,
        parameters: asJson(body.parameters ?? []),
        changelog: "Initial version",
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "automation.create",
      resource: "automation",
      resourceId: automation.id,
      ...meta,
    });

    return Response.json(automation, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
