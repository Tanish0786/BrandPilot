import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scrape";
import { runExtraction } from "@/lib/extractProfile";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to extract a brand profile" }, { status: 401 });
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

  const result = await runExtraction((retry) => buildPrompt(scrapeResult.text, retry));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { error: saveError } = await supabase
    .from("brand_profiles")
    .upsert({ ...result.data, user_id: user.id, source_url: body.url }, { onConflict: "user_id" });

  if (saveError) {
    return NextResponse.json(
      { error: `Extracted profile but failed to save it: ${saveError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
