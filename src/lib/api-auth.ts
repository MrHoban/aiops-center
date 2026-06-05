import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { hasPermission, Permission } from "@/lib/rbac";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role: (session.user.role as UserRole) ?? UserRole.TECHNICIAN,
    organizationId: session.user.organizationId ?? "",
  };
}

export async function requireAuth(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  if (permission && !hasPermission(user.role, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function getClientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
