import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";

const limiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10) / 1000,
});

export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  try {
    await limiter.consume(ip);
    return null;
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
}
