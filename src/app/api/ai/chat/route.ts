import { NextRequest } from "next/server";
import { asJson } from "@/lib/prisma-json";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { aiChatSchema } from "@/lib/validations";
import { chatWithRAG } from "@/lib/ai/openai";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("ai:use");

    const conversations = await prisma.aIConversation.findMany({
      where: { organizationId: user.organizationId, userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    return Response.json({ items: conversations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  try {
    const user = await requireAuth("ai:use");
    const body = aiChatSchema.parse(await request.json());

    const existing = body.conversationId
      ? await prisma.aIConversation.findFirst({
          where: {
            id: body.conversationId,
            organizationId: user.organizationId,
            userId: user.id,
          },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;

    const conversation =
      existing ??
      (await prisma.aIConversation.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          title: body.message.slice(0, 60),
          context: asJson(body.context ?? {}),
        },
        include: { messages: true },
      }));

    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: body.message,
      },
    });

    const history = [
      ...conversation.messages.map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: m.content,
      })),
      { role: "user" as const, content: body.message },
    ];

    const { content, citations } = await chatWithRAG({
      organizationId: user.organizationId,
      messages: history,
      context: body.context,
    });

    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content,
        citations: citations.map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          score: c.score,
        })),
      },
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return Response.json({
      conversationId: conversation.id,
      message: assistantMessage,
      citations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
