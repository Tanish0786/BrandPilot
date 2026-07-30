import { GoogleGenAI } from "@google/genai";
import { brandProfileSchema } from "@/lib/brandProfileSchema";
import type { BrandProfile } from "@/types/brandProfile";

const MODEL = "gemini-flash-lite-latest";

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

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export type ExtractResult = { ok: true; data: BrandProfile } | { ok: false; error: string };

/**
 * Shared LLM call + JSON-schema-constrained output + Zod validation + one
 * retry, used by both the URL-scrape path and the questionnaire path.
 * `buildPrompt(retry)` supplies the path-specific prompt; retry=true asks
 * for a corrected response after a validation failure.
 */
export async function runExtraction(buildPrompt: (retry: boolean) => string): Promise<ExtractResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Server is missing GEMINI_API_KEY" };
  }

  const client = new GoogleGenAI({ apiKey });
  let lastFailureReason = "Unknown error";

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildPrompt(attempt > 0);

    let outputText: string | undefined;
    try {
      const response = await client.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      outputText = response.text;
    } catch (err) {
      console.error("runExtraction: LLM request failed", err);
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
      return { ok: true, data: result.data };
    }

    lastFailureReason = `The LLM's response didn't match the required schema: ${result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")}`;
  }

  return {
    ok: false,
    error: `Could not extract a valid brand profile after two attempts. ${lastFailureReason}`,
  };
}
