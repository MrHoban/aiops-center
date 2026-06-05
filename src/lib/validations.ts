import { z } from "zod";
import { AssetType, AlertSeverity, AlertSource, AutomationLanguage, KnowledgeCategory, CloudProvider, ReportType, ReportFormat } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  organizationName: z.string().min(1).max(100),
});

export const assetSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(AssetType),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"]).optional(),
  serialNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  hostname: z.string().optional(),
  operatingSystem: z.string().optional(),
  ownerId: z.string().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  healthScore: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const alertSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  severity: z.nativeEnum(AlertSeverity),
  source: z.nativeEnum(AlertSource).default("MANUAL"),
  assetId: z.string().optional(),
  correlationId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const automationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  language: z.nativeEnum(AutomationLanguage),
  script: z.string().min(1),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean"]),
    required: z.boolean().default(false),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })).optional(),
  schedule: z.string().optional(),
  requiresApproval: z.boolean().optional(),
});

export const knowledgeSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  category: z.nativeEnum(KnowledgeCategory),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export const cloudResourceSchema = z.object({
  provider: z.nativeEnum(CloudProvider),
  resourceId: z.string().min(1),
  name: z.string().min(1),
  resourceType: z.string().min(1),
  region: z.string().optional(),
  status: z.string().optional(),
  monthlyCost: z.number().optional(),
  securityFindings: z.array(z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const reportSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

export const aiChatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(10000),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
