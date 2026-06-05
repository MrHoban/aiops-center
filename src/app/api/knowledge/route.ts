import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, getClientMeta } from "@/lib/api-auth";
import { knowledgeSchema, paginationSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { indexKnowledgeArticle } from "@/lib/ai/openai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("knowledge:read");
    const params = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const category = request.nextUrl.searchParams.get("category");
    const q = request.nextUrl.searchParams.get("q");

    const where = {
      organizationId: user.organizationId,
      isPublished: true,
      ...(category ? { category: category as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { content: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    return Response.json({ items, total, page: params.page, limit: params.limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("knowledge:write");
    const body = knowledgeSchema.parse(await request.json());
    const meta = getClientMeta(request);

    const article = await prisma.knowledgeArticle.create({
      data: {
        ...body,
        organizationId: user.organizationId,
        authorId: user.id,
        tags: body.tags ?? [],
      },
      include: { author: { select: { id: true, name: true } } },
    });

    if (process.env.OPENAI_API_KEY) {
      indexKnowledgeArticle(article.id).catch(console.error);
    }

    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      action: "knowledge.create",
      resource: "knowledge_article",
      resourceId: article.id,
      ...meta,
    });

    return Response.json(article, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
