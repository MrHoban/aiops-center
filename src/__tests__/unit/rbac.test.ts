import { describe, it, expect } from "vitest";
import { hasPermission, requirePermission } from "@/lib/rbac";

describe("RBAC", () => {
  it("grants administrators full access", () => {
    expect(hasPermission("ADMINISTRATOR", "users:write")).toBe(true);
    expect(hasPermission("ADMINISTRATOR", "automations:delete")).toBe(true);
  });

  it("restricts read-only users", () => {
    expect(hasPermission("READ_ONLY", "assets:write")).toBe(false);
    expect(hasPermission("READ_ONLY", "assets:read")).toBe(true);
    expect(hasPermission("READ_ONLY", "ai:use")).toBe(false);
  });

  it("allows technicians to execute automations", () => {
    expect(hasPermission("TECHNICIAN", "automations:execute")).toBe(true);
    expect(hasPermission("TECHNICIAN", "automations:write")).toBe(false);
  });

  it("throws on missing permission", () => {
    expect(() => requirePermission("READ_ONLY", "alerts:write")).toThrow("Forbidden");
  });
});
