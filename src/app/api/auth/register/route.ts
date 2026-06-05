import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/crypto";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { getClientMeta } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const data = registerSchema.parse(body);
    const meta = getClientMeta(request);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const slug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: `${slug}-${Date.now().toString(36)}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: hashPassword(data.password),
        role: "ADMINISTRATOR",
        organizationId: org.id,
      },
    });

    await createAuditLog({
      organizationId: org.id,
      userId: user.id,
      action: "user.register",
      resource: "user",
      resourceId: user.id,
      ...meta,
    });

    return Response.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return Response.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
