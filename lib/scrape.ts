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

export type ScrapeResult =
  | { ok: true; text: string }
  | { ok: false; error: string; status: number };

export function parseUrl(raw: string): URL | null {
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

export async function scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
  const url = parseUrl(rawUrl);
  if (!url) {
    return { ok: false, error: "Invalid URL format", status: 400 };
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
      return { ok: false, error: "Request timed out while fetching the site", status: 504 };
    }
    return {
      ok: false,
      error: "Could not reach the site — it may be blocking automated requests or unreachable",
      status: 502,
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      return {
        ok: false,
        error: `Site blocked the request (status ${response.status})`,
        status: 502,
      };
    }
    return { ok: false, error: `Site responded with status ${response.status}`, status: 502 };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return {
      ok: false,
      error: `Expected HTML but got content-type "${contentType || "unknown"}"`,
      status: 502,
    };
  }

  let html: string;
  try {
    html = await response.text();
  } catch {
    return { ok: false, error: "Failed to read response body", status: 502 };
  }

  const text = cleanHtmlToText(html);

  if (!text) {
    return { ok: false, error: "No readable text found on the page", status: 502 };
  }

  return { ok: true, text };
}
