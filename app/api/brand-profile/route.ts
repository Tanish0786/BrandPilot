import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandProfileSchema } from "@/lib/brandProfileSchema";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("brand_profiles")
    .select(
      "business_name, vertical, tone_descriptors, target_audience, value_props, keywords, example_phrases, source, source_url, updated_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "No brand profile found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = brandProfileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: `Profile didn't match the required shape: ${result.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")}`,
      },
      { status: 400 }
    );
  }

  const { error: saveError } = await supabase
    .from("brand_profiles")
    .upsert({ ...result.data, user_id: user.id }, { onConflict: "user_id" });

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
