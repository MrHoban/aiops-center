import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/rbac";
import { assetSchema, alertSchema, registerSchema } from "@/lib/validations";

describe("API integration — validation + RBAC pipeline", () => {
  it("allows engineer to manage alerts end-to-end (permission check)", () => {
    expect(hasPermission("ENGINEER", "alerts:write")).toBe(true);
    expect(hasPermission("ENGINEER", "alerts:read")).toBe(true);
    expect(hasPermission("READ_ONLY", "alerts:write")).toBe(false);
  });

  it("validates a complete asset registration payload", () => {
    const payload = {
      name: "Production DB Server",
      type: "SERVER" as const,
      ipAddress: "10.0.5.20",
      hostname: "db-prod-01",
      operatingSystem: "Ubuntu 24.04",
      healthScore: 88,
      metadata: { rack: "A1", datacenter: "east" },
    };

    const parsed = assetSchema.parse(payload);
    expect(parsed.name).toBe("Production DB Server");
    expect(parsed.type).toBe("SERVER");
  });

  it("validates alert ingestion from API source", () => {
    const payload = {
      title: "Database connection pool exhausted",
      description: "Connection pool at 100% for 10 minutes",
      severity: "CRITICAL" as const,
      source: "API" as const,
      assetId: "cltest123",
      metadata: { threshold: 100, current: 100 },
    };

    const parsed = alertSchema.parse(payload);
    expect(parsed.source).toBe("API");
    expect(parsed.severity).toBe("CRITICAL");
  });

  it("validates organization registration flow input", () => {
    const payload = {
      email: "admin@msp.example.com",
      password: "SecurePass123!",
      name: "Site Admin",
      organizationName: "Contoso MSP",
    };

    const parsed = registerSchema.parse(payload);
    expect(parsed.organizationName).toBe("Contoso MSP");
  });

  it("enforces RBAC matrix for automation execution", () => {
    expect(hasPermission("TECHNICIAN", "automations:execute")).toBe(true);
    expect(hasPermission("TECHNICIAN", "automations:write")).toBe(false);
    expect(hasPermission("ADMINISTRATOR", "automations:delete")).toBe(true);
    expect(hasPermission("READ_ONLY", "automations:execute")).toBe(false);
  });
});
