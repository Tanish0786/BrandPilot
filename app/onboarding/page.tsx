import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) {
    redirect("/dashboard/profile");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">Do you have a website?</h1>
        <p className="text-sm text-zinc-500">
          We&apos;ll use it to build your brand profile automatically.
        </p>

        <Link
          href="/onboarding/url"
          className="bg-black text-white rounded px-4 py-2"
        >
          Yes, use my website
        </Link>
        <Link href="/onboarding/questionnaire" className="border rounded px-4 py-2">
          No, I&apos;ll answer a few questions instead
        </Link>
      </div>
    </div>
  );
}
