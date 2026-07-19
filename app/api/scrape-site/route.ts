import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 8_000;
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "svg",
  "iframe",
  "form",
  "select",
  "option",
];
const USER_AGENT =
  "Mozilla/5.0 (compatible; BrandPilotBot/0.1; +https://brand-pilot-zeta.vercel.app)";

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function cleanHtmlToText(html: string): string {
  const $ = cheerio.load(html);
  $(STRIP_SELECTORS.join(", ")).remove();

  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_TEXT_LENGTH);
}

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

  const url = parseUrl(rawUrl);
  if (!url) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out while fetching the site" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Could not reach the site — it may be blocking automated requests or unreachable" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      return NextResponse.json(
        { error: `Site blocked the request (status ${response.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: `Site responded with status ${response.status}` },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return NextResponse.json(
      { error: `Expected HTML but got content-type "${contentType || "unknown"}"` },
      { status: 502 }
    );
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return NextResponse.json({ error: "Failed to read response body" }, { status: 502 });
  }

  const text = cleanHtmlToText(html);

  if (!text) {
    return NextResponse.json(
      { error: "No readable text found on the page" },
      { status: 502 }
    );
  }

  return new NextResponse(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
