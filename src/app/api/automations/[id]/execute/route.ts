import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { asJson } from "@/lib/prisma-json";

type RouteContext = { params: Promise<{ id: string }> };

const executeSchema = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("automations:execute");
    const { id } = await context.params;
    const body = executeSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const automation = await prisma.automation.findFirst({
      where: { id, organizationId: user.organizationId, isActive: true },
    });
    if (!automation) return Response.json({ error: "Not found" }, { status: 404 });

    const status = automation.requiresApproval ? "AWAITING_APPROVAL" : "PENDING";

    const run = await prisma.automationRun.create({
      data: {
        automationId: id,
        status,
        parameters: asJson(body.parameters ?? {}),
        executedById: user.id,
      },
    });

    if (!automation.requiresApproval) {
      await executeAutomationRun(run.id, automation.script, automation.language);
    }

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "automation.execute",
      resource: "automation_run",
      resourceId: run.id,
      ...meta,
    });

    return Response.json(run, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

async function executeAutomationRun(
  runId: string,
  script: string,
  language: string,
): Promise<void> {
  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const output = `[Simulated ${language} execution]\nScript length: ${script.length} chars\nStatus: Success\nTimestamp: ${new Date().toISOString()}`;

    await prisma.automationRun.update({
      where: { id: runId },
      data: { status: "COMPLETED", output, completedAt: new Date() },
    });
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}
