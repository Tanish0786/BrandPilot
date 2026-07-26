import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaptionGenerator from "./caption-generator";

export default async function CaptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 justify-center p-8">
      <div className="w-full max-w-2xl">
        <CaptionGenerator />
      </div>
    </div>
  );
}
