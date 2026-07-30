import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["pending", "approved", "edited", "rejected"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  let body: { status?: unknown; generated_text?: unknown; feedback_note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: { status?: string; generated_text?: string; feedback_note?: string } = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.generated_text !== undefined) {
    if (typeof body.generated_text !== "string" || !body.generated_text.trim()) {
      return NextResponse.json({ error: "generated_text cannot be empty" }, { status: 400 });
    }
    update.generated_text = body.generated_text;
  }

  if (body.feedback_note !== undefined) {
    if (typeof body.feedback_note !== "string") {
      return NextResponse.json({ error: "Invalid feedback_note" }, { status: 400 });
    }
    update.feedback_note = body.feedback_note;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_pieces")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, input_prompt, generated_text, status, feedback_note, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
