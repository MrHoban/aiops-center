import { prisma } from "@/lib/prisma";
import { asJson } from "@/lib/prisma-json";

interface AuditParams {
  organizationId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: asJson(params.details ?? {}),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}
