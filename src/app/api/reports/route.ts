import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { reportSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { asJson } from "@/lib/prisma-json";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("reports:read");

    const reports = await prisma.report.findMany({
      where: { organizationId: user.organizationId },
      include: { generatedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return Response.json({ items: reports });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("reports:generate");
    const body = reportSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const data = await generateReportData(user.organizationId, body.type);

    const report = await prisma.report.create({
      data: {
        name: body.name,
        type: body.type,
        format: body.format,
        parameters: asJson(body.parameters ?? {}),
        organizationId: user.organizationId,
        generatedById: user.id,
        fileUrl: `/api/reports/download/${body.type}.${body.format.toLowerCase()}`,
      },
    });

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "report.generate",
      resource: "report",
      resourceId: report.id,
      details: { type: body.type, format: body.format, rowCount: data.length },
      ...meta,
    });

    return Response.json({ ...report, preview: data.slice(0, 10) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

async function generateReportData(
  organizationId: string,
  type: string,
): Promise<Record<string, unknown>[]> {
  switch (type) {
    case "ASSET":
      return prisma.asset.findMany({
        where: { organizationId },
        select: {
          name: true,
          type: true,
          status: true,
          healthScore: true,
          ipAddress: true,
          operatingSystem: true,
        },
      });
    case "ALERT":
      return prisma.alert.findMany({
        where: { organizationId },
        select: {
          title: true,
          severity: true,
          status: true,
          source: true,
          createdAt: true,
        },
        take: 1000,
        orderBy: { createdAt: "desc" },
      });
    case "COMPLIANCE":
      return prisma.auditLog.findMany({
        where: { organizationId },
        select: { action: true, resource: true, createdAt: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      });
    default:
      const [assets, alerts, incidents] = await Promise.all([
        prisma.asset.count({ where: { organizationId } }),
        prisma.alert.count({
          where: { organizationId, status: { in: ["OPEN", "ESCALATED"] } },
        }),
        prisma.incident.count({
          where: { organizationId, status: { in: ["OPEN", "INVESTIGATING"] } },
        }),
      ]);
      return [{ assets, openAlerts: alerts, openIncidents: incidents }];
  }
}
