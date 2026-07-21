import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scrape";

async function getRequestUrl(request: NextRequest): Promise<string | null> {
  const queryUrl = request.nextUrl.searchParams.get("url");
  if (queryUrl) return queryUrl;

  try {
    const body = await request.json();
    return typeof body?.url === "string" ? body.url : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const rawUrl = await getRequestUrl(request);

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const result = await scrapeUrl(rawUrl);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(result.text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
