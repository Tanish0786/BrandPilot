import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { scrapeUrl } from "@/lib/scrape";
import { brandProfileSchema } from "@/lib/brandProfileSchema";

const MODEL = "gemini-3.5-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    business_name: { type: "string" },
    vertical: { type: "string" },
    tone_descriptors: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
    },
    target_audience: { type: "string" },
    value_props: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      minItems: 5,
      maxItems: 10,
    },
    example_phrases: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
    },
    source: { type: "string", enum: ["url", "questionnaire"] },
  },
  required: [
    "business_name",
    "vertical",
    "tone_descriptors",
    "target_audience",
    "value_props",
    "keywords",
    "example_phrases",
    "source",
  ],
};

function buildPrompt(siteText: string, retry: boolean): string {
  const base = `You are extracting a structured brand profile for a local service business from the text of its own website homepage. Base every field on the actual language, claims, and phrasing used in the website text below — do not fall back on generic marketing boilerplate that could describe any business in this vertical.

Website text:
"""
${siteText}
"""

Field guidance:
- business_name: the business's own name, as used on the site.
- vertical: the specific type of local service business (e.g. "tuition centre"), inferred from what the site actually offers.
- tone_descriptors: 3-5 adjectives that describe how THIS site actually sounds — read its actual sentences and word choice, don't guess a generic tone for the vertical.
- target_audience: a short plain description of who this specific site's language is speaking to (age, role, mindset) — base it on who the site addresses, not a generic assumption.
- value_props: the specific reasons this business gives (explicitly or implicitly) for why someone should choose it, in its own terms.
- keywords: 5-10 words or short phrases this specific business would want associated with its captions and hashtags, drawn from its actual services and language.
- example_phrases: 1-3 short phrases lifted or closely adapted from the site's own wording, written in its own voice — not phrases you invented from scratch.
- source: always set this to "url".

If the site's text is thin or generic and you can't be fully confident about a field, make your best reasonable inference from what is there rather than leaving it vague, empty, or generic — a human will review and correct this afterward, so a specific guess is more useful than a safe generic answer.

Return only the fields defined by the schema.`;

  if (!retry) return base;

  return `${base}

Your previous response was not valid JSON matching the required schema. Return ONLY a single valid JSON object matching the schema exactly — no markdown code fences, no commentary before or after, every field present with the correct type.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing GEMINI_API_KEY" }, { status: 500 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.url !== "string" || !body.url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const scrapeResult = await scrapeUrl(body.url);
  if (!scrapeResult.ok) {
    return NextResponse.json({ error: scrapeResult.error }, { status: scrapeResult.status });
  }

  const client = new GoogleGenAI({ apiKey });

  let lastFailureReason = "Unknown error";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(scrapeResult.text, attempt > 0);

    let outputText: string | undefined;
    try {
      const interaction = await client.interactions.create({
        model: MODEL,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESPONSE_SCHEMA,
        },
      });
      outputText = interaction.output_text;
    } catch {
      lastFailureReason = "The LLM request failed";
      continue;
    }

    if (!outputText) {
      lastFailureReason = "The LLM returned an empty response";
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripCodeFences(outputText));
    } catch {
      lastFailureReason = "The LLM's response was not valid JSON";
      continue;
    }

    const result = brandProfileSchema.safeParse(parsedJson);
    if (result.success) {
      return NextResponse.json(result.data);
    }

    lastFailureReason = `The LLM's response didn't match the required schema: ${result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")}`;
  }

  return NextResponse.json(
    { error: `Could not extract a valid brand profile after two attempts. ${lastFailureReason}` },
    { status: 502 }
  );
}
