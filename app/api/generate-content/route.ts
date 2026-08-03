import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

const MODEL = "gemini-flash-lite-latest";

const CONTENT_TYPES = ["social_caption", "blog_outline"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

type BrandProfileForPrompt = {
  business_name: string;
  vertical: string;
  tone_descriptors: string[];
  target_audience: string;
  value_props: string[];
  keywords: string[];
};

function buildSocialCaptionPrompt(profile: BrandProfileForPrompt, topic: string, note?: string): string {
  return `You are writing a single social media caption for a local service business, in its own voice.

Business: ${profile.business_name} (${profile.vertical})
Tone: ${profile.tone_descriptors.join(", ")}
Audience: ${profile.target_audience}
What makes them worth choosing: ${profile.value_props.join("; ")}
Relevant keywords: ${profile.keywords.join(", ")}

Write one social media caption for this post topic/goal: "${topic}"
${note ? `\nSpecific instruction for this caption, follow it closely: ${note}\n` : ""}
Guidelines:
- Write in the tone described above — sound like this specific business, not a generic template that could fit any business in this vertical.
- Speak to the audience described above.
- Weave in a relevant value prop or two where it fits naturally, don't just list them.
- Keep it a natural length for a real social post (roughly 2-5 sentences), not an essay.
- You may include 1-3 relevant hashtags at the end if it fits the vibe, but don't force them.
- Return ONLY the caption text — no surrounding quotation marks, no preamble, no explanation, no multiple options.`;
}

function buildBlogOutlinePrompt(profile: BrandProfileForPrompt, topic: string, note?: string): string {
  return `You are outlining a short blog post for a local service business, in its own voice.

Business: ${profile.business_name} (${profile.vertical})
Tone: ${profile.tone_descriptors.join(", ")}
Audience: ${profile.target_audience}
What makes them worth choosing: ${profile.value_props.join("; ")}
Relevant keywords: ${profile.keywords.join(", ")}

Write a short blog post outline for this topic/goal: "${topic}"
${note ? `\nSpecific instruction for this outline, follow it closely: ${note}\n` : ""}
Guidelines:
- Write in the tone described above — sound like this specific business, not a generic template that could fit any business in this vertical.
- Speak to the audience described above.
- Ground the outline in real specifics from the value props/keywords where it fits naturally, not generic blog filler.
- Use exactly 3 to 5 sections, no more, no less.
- Format the response as plain text, exactly like this, with no markdown symbols (no #, no **, no bullets) and no extra commentary before or after:

Title: <a compelling blog post title>

1. <Section header> — <one sentence describing what this section covers>
2. <Section header> — <one sentence describing what this section covers>
(continue for 3 to 5 sections total)`;
}

function buildPrompt(
  contentType: ContentType,
  profile: BrandProfileForPrompt,
  topic: string,
  note?: string
): string {
  if (contentType === "blog_outline") {
    return buildBlogOutlinePrompt(profile, topic, note);
  }
  return buildSocialCaptionPrompt(profile, topic, note);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to generate content" }, { status: 401 });
  }

  let body: { topic?: unknown; note?: unknown; contentType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) {
    return NextResponse.json({ error: "Missing topic" }, { status: 400 });
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  const contentType: ContentType =
    typeof body.contentType === "string" && CONTENT_TYPES.includes(body.contentType as ContentType)
      ? (body.contentType as ContentType)
      : "social_caption";

  if (body.contentType !== undefined && !CONTENT_TYPES.includes(body.contentType as ContentType)) {
    return NextResponse.json(
      { error: `Invalid contentType — must be one of: ${CONTENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("brand_profiles")
    .select("business_name, vertical, tone_descriptors, target_audience, value_props, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: "No brand profile found — complete onboarding first" },
      { status: 404 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing GEMINI_API_KEY" }, { status: 500 });
  }

  const client = new GoogleGenAI({ apiKey });

  let generatedText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: buildPrompt(contentType, profile as BrandProfileForPrompt, topic, note),
    });
    generatedText = response.text?.trim();
  } catch (err) {
    console.error("generate-content: LLM request failed", err);
    return NextResponse.json({ error: "The content request failed" }, { status: 502 });
  }

  if (!generatedText) {
    return NextResponse.json({ error: "The LLM returned an empty response" }, { status: 502 });
  }

  const { data: piece, error: insertError } = await supabase
    .from("content_pieces")
    .insert({
      user_id: user.id,
      type: contentType,
      input_prompt: topic,
      generated_text: generatedText,
      status: "pending",
      model_used: MODEL,
    })
    .select("id, input_prompt, generated_text, status, created_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `Generated content but failed to save it: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(piece);
}
