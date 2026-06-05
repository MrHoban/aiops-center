import { describe, it, expect } from "vitest";
import { assetSchema, alertSchema, loginSchema } from "@/lib/validations";

describe("Validation schemas", () => {
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "invalid", password: "12345678" }).success).toBe(false);
  });

  it("validates asset creation", () => {
    const result = assetSchema.safeParse({
      name: "Test Server",
      type: "SERVER",
      ipAddress: "10.0.0.1",
    });
    expect(result.success).toBe(true);
  });

  it("validates alert creation", () => {
    const result = alertSchema.safeParse({
      title: "Test Alert",
      description: "Something happened",
      severity: "CRITICAL",
    });
    expect(result.success).toBe(true);
  });
});
