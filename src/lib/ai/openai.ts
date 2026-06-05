import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export interface RAGResult {
  id: string;
  title: string;
  content: string;
  category: string;
  score: number;
}

export async function searchKnowledge(
  organizationId: string,
  query: string,
  limit = 5,
): Promise<RAGResult[]> {
  const embedding = await generateEmbedding(query);
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      content: string;
      category: string;
      score: number;
    }>
  >`
    SELECT id, title, content, category::text,
           1 - (embedding <=> ${vectorStr}::vector) AS score
    FROM knowledge_articles
    WHERE organization_id = ${organizationId}
      AND is_published = true
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;

  return results;
}

const SYSTEM_PROMPT = `You are AIOps Center AI Assistant — an expert IT operations copilot for MSPs and enterprise teams.
You help explain alerts, recommend remediation steps, summarize incidents, generate scripts, and answer questions about managed infrastructure.
Always cite knowledge base sources when available. Be concise, actionable, and security-conscious.
Never execute commands — only recommend them. Format PowerShell with proper commenting.`;

export async function chatWithRAG(params: {
  organizationId: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context?: Record<string, unknown>;
}): Promise<{ content: string; citations: RAGResult[] }> {
  const lastUserMessage = [...params.messages].reverse().find((m) => m.role === "user");
  const citations = lastUserMessage
    ? await searchKnowledge(params.organizationId, lastUserMessage.content)
    : [];

  const contextBlock = citations.length
    ? `\n\nRelevant knowledge base articles:\n${citations
        .map((c, i) => `[${i + 1}] ${c.title} (${c.category}):\n${c.content.slice(0, 1500)}`)
        .join("\n\n")}`
    : "";

  const contextInfo = params.context
    ? `\n\nSession context: ${JSON.stringify(params.context)}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT + contextBlock + contextInfo },
      ...params.messages,
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  return {
    content: response.choices[0]?.message?.content ?? "No response generated.",
    citations,
  };
}

export async function generateRiskSummary(organizationId: string): Promise<string> {
  const [criticalAlerts, lowHealthAssets, openIncidents] = await Promise.all([
    prisma.alert.count({
      where: { organizationId, severity: "CRITICAL", status: { in: ["OPEN", "ESCALATED"] } },
    }),
    prisma.asset.count({
      where: { organizationId, healthScore: { lt: 70 } },
    }),
    prisma.incident.count({
      where: { organizationId, status: { in: ["OPEN", "INVESTIGATING"] } },
    }),
  ]);

  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: "Generate a brief executive risk summary for IT leadership. 2-3 sentences max.",
      },
      {
        role: "user",
        content: `Critical alerts: ${criticalAlerts}, Low health assets (<70): ${lowHealthAssets}, Open incidents: ${openIncidents}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content ?? "Risk assessment unavailable.";
}

export async function indexKnowledgeArticle(articleId: string): Promise<void> {
  const article = await prisma.knowledgeArticle.findUnique({ where: { id: articleId } });
  if (!article) return;

  const text = `${article.title}\n\n${article.content}`;
  const embedding = await generateEmbedding(text);
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE knowledge_articles
    SET embedding = ${vectorStr}::vector
    WHERE id = ${articleId}
  `;
}
