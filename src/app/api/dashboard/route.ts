import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { generateRiskSummary } from "@/lib/ai/openai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("dashboard:read");
    const orgId = user.organizationId;

    const [
      alertCounts,
      assets,
      automationRuns,
      cloudResources,
      incidents,
      recentAlerts,
    ] = await Promise.all([
      prisma.alert.groupBy({
        by: ["severity"],
        where: { organizationId: orgId, status: { in: ["OPEN", "ACKNOWLEDGED", "ESCALATED"] } },
        _count: true,
      }),
      prisma.asset.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        select: { id: true, name: true, healthScore: true, type: true },
        orderBy: { healthScore: "asc" },
        take: 10,
      }),
      prisma.automationRun.findMany({
        where: { automation: { organizationId: orgId } },
        include: { automation: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.cloudResource.groupBy({
        by: ["provider", "status"],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.incident.count({
        where: { organizationId: orgId, status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.alert.findMany({
        where: { organizationId: orgId, status: { in: ["OPEN", "ESCALATED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { asset: { select: { name: true } } },
      }),
    ]);

    const totalAssets = await prisma.asset.count({ where: { organizationId: orgId } });
    const healthyAssets = await prisma.asset.count({
      where: { organizationId: orgId, healthScore: { gte: 80 } },
    });
    const slaCompliance = totalAssets > 0 ? Math.round((healthyAssets / totalAssets) * 100) : 100;

    let riskSummary = "Risk assessment loading...";
    try {
      if (process.env.OPENAI_API_KEY) {
        riskSummary = await generateRiskSummary(orgId);
      }
    } catch {
      riskSummary = "AI risk summary unavailable.";
    }

    return Response.json({
      alerts: {
        critical: alertCounts.find((a) => a.severity === "CRITICAL")?._count ?? 0,
        warning: alertCounts.find((a) => a.severity === "WARNING")?._count ?? 0,
        informational: alertCounts.find((a) => a.severity === "INFORMATIONAL")?._count ?? 0,
        recent: recentAlerts,
      },
      deviceHealth: assets,
      cloudStatus: cloudResources,
      automationHistory: automationRuns,
      openIncidents: incidents,
      slaCompliance,
      riskSummary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
