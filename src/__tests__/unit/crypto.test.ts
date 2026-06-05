import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/crypto";

describe("Crypto", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("test-password-123");
    expect(verifyPassword("test-password-123", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces unique hashes for same password", () => {
    const hash1 = hashPassword("same-password");
    const hash2 = hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });
});
