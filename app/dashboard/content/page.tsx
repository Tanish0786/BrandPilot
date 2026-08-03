import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContentGenerator from "./content-generator";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: pieces } = await supabase
    .from("content_pieces")
    .select("id, type, input_prompt, generated_text, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 justify-center p-8">
      <div className="w-full max-w-2xl">
        <ContentGenerator initialPieces={pieces ?? []} />
      </div>
    </div>
  );
}
