import { NextRequest, NextResponse } from "next/server";
import { runExtraction } from "@/lib/extractProfile";
import { createClient } from "@/lib/supabase/server";

type QuestionnaireBody = {
  business_name?: unknown;
  offer?: unknown;
  customers?: unknown;
  vibe?: unknown;
  differentiator?: unknown;
  existing_text?: unknown;
};

const REQUIRED_FIELDS = ["business_name", "offer", "customers", "vibe", "differentiator"] as const;

function buildPrompt(answers: Record<string, string>, retry: boolean): string {
  const base = `You are normalizing a local service business owner's own answers about their business into a structured brand profile. Base every field on the actual language and specifics the owner used below — do not fall back on generic marketing boilerplate that could describe any business in this vertical.

Business name: ${answers.business_name}

What they offer / services provided:
"""
${answers.offer}
"""

Who their typical customers are:
"""
${answers.customers}
"""

How they want to sound when talking to customers (their described vibe):
"""
${answers.vibe}
"""

What makes them different / what they're most proud of:
"""
${answers.differentiator}
"""
${
  answers.existing_text
    ? `\nText the owner has already written about their business (bio, flyer, Google Business description, etc — treat this as the strongest signal for their actual voice):\n"""\n${answers.existing_text}\n"""\n`
    : ""
}

Field guidance:
- business_name: use the name as given.
- vertical: the specific type of local service business, inferred from what they say they offer.
- tone_descriptors: 3-5 adjectives grounded in how the owner actually described their vibe above — don't substitute a generic tone for the vertical.
- target_audience: a short plain description of who they said their typical customers are.
- value_props: the specific reasons to choose this business, drawn from what they said makes them different or what they're proud of.
- keywords: 5-10 words or short phrases relevant to this specific business's services and language.
- example_phrases: 1-3 short phrases in the owner's own voice — prefer lifting or closely adapting from any pasted existing text if provided; otherwise closely paraphrase their own wording from the answers above, don't invent generic taglines.
- source: always set this to "questionnaire".

If an answer is thin, make your best reasonable inference from what is there rather than leaving a field vague, empty, or generic — a human will review and correct this afterward, so a specific guess is more useful than a safe generic answer.

Return only the fields defined by the schema.`;

  if (!retry) return base;

  return `${base}

Your previous response was not valid JSON matching the required schema. Return ONLY a single valid JSON object matching the schema exactly — no markdown code fences, no commentary before or after, every field present with the correct type.`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to submit the questionnaire" }, { status: 401 });
  }

  let body: QuestionnaireBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  for (const field of REQUIRED_FIELDS) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      return NextResponse.json({ error: `Missing ${field}` }, { status: 400 });
    }
  }

  const answers = {
    business_name: (body.business_name as string).trim(),
    offer: (body.offer as string).trim(),
    customers: (body.customers as string).trim(),
    vibe: (body.vibe as string).trim(),
    differentiator: (body.differentiator as string).trim(),
    existing_text: typeof body.existing_text === "string" ? body.existing_text.trim() : "",
  };

  const result = await runExtraction((retry) => buildPrompt(answers, retry));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { error: saveError } = await supabase
    .from("brand_profiles")
    .upsert({ ...result.data, user_id: user.id, source_url: null }, { onConflict: "user_id" });

  if (saveError) {
    return NextResponse.json(
      { error: `Extracted profile but failed to save it: ${saveError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
