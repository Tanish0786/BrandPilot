import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

const MODEL = "gemini-flash-lite-latest";

type CaptionProfile = {
  business_name: string;
  vertical: string;
  tone_descriptors: string[];
  target_audience: string;
  value_props: string[];
  keywords: string[];
};

function buildPrompt(profile: CaptionProfile, topic: string, note?: string): string {
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to generate a caption" }, { status: 401 });
  }

  let body: { topic?: unknown; note?: unknown };
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

  let caption: string | undefined;
  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: buildPrompt(profile as CaptionProfile, topic, note),
    });
    caption = interaction.output_text?.trim();
  } catch {
    return NextResponse.json({ error: "The caption request failed" }, { status: 502 });
  }

  if (!caption) {
    return NextResponse.json({ error: "The LLM returned an empty response" }, { status: 502 });
  }

  const { data: piece, error: insertError } = await supabase
    .from("content_pieces")
    .insert({
      user_id: user.id,
      type: "social_caption",
      input_prompt: topic,
      generated_text: caption,
      status: "pending",
      model_used: MODEL,
    })
    .select("id, input_prompt, generated_text, status, created_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: `Generated a caption but failed to save it: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(piece);
}
