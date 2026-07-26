import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("business_name, vertical, tone_descriptors")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p>Logged in as {user.email}</p>

        <div className="border rounded p-4 text-left flex flex-col gap-1">
          <p className="font-medium">{profile.business_name}</p>
          <p className="text-sm text-zinc-500">{profile.vertical}</p>
          <p className="text-sm text-zinc-500">
            {(profile.tone_descriptors as string[]).join(" · ")}
          </p>
        </div>

        <Link href="/dashboard/captions" className="underline text-sm font-medium">
          Generate captions
        </Link>
        <Link href="/dashboard/profile" className="underline text-sm">
          View / edit brand profile
        </Link>
        <Link href="/scrape-test" className="underline text-sm">
          Scrape / extract test tool
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
