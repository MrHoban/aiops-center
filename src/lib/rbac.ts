import { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard:read"
  | "dashboard:write"
  | "assets:read"
  | "assets:write"
  | "assets:delete"
  | "alerts:read"
  | "alerts:write"
  | "alerts:delete"
  | "automations:read"
  | "automations:write"
  | "automations:execute"
  | "automations:delete"
  | "knowledge:read"
  | "knowledge:write"
  | "cloud:read"
  | "cloud:write"
  | "reports:read"
  | "reports:generate"
  | "users:read"
  | "users:write"
  | "audit:read"
  | "ai:use";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMINISTRATOR: [
    "dashboard:read",
    "dashboard:write",
    "assets:read",
    "assets:write",
    "assets:delete",
    "alerts:read",
    "alerts:write",
    "alerts:delete",
    "automations:read",
    "automations:write",
    "automations:execute",
    "automations:delete",
    "knowledge:read",
    "knowledge:write",
    "cloud:read",
    "cloud:write",
    "reports:read",
    "reports:generate",
    "users:read",
    "users:write",
    "audit:read",
    "ai:use",
  ],
  ENGINEER: [
    "dashboard:read",
    "dashboard:write",
    "assets:read",
    "assets:write",
    "assets:delete",
    "alerts:read",
    "alerts:write",
    "alerts:delete",
    "automations:read",
    "automations:write",
    "automations:execute",
    "knowledge:read",
    "knowledge:write",
    "cloud:read",
    "reports:read",
    "reports:generate",
    "users:read",
    "audit:read",
    "ai:use",
  ],
  TECHNICIAN: [
    "dashboard:read",
    "assets:read",
    "assets:write",
    "alerts:read",
    "alerts:write",
    "automations:read",
    "automations:execute",
    "knowledge:read",
    "cloud:read",
    "reports:read",
    "reports:generate",
    "ai:use",
  ],
  READ_ONLY: [
    "dashboard:read",
    "assets:read",
    "alerts:read",
    "automations:read",
    "knowledge:read",
    "cloud:read",
    "reports:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: "Administrator",
  ENGINEER: "Engineer",
  TECHNICIAN: "Technician",
  READ_ONLY: "Read-Only User",
};
