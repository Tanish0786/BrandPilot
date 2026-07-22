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

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p>Logged in as {user.email}</p>
        <Link href="/dashboard/profile" className="underline text-sm">
          Brand profile
        </Link>
        <Link href="/scrape-test" className="underline text-sm">
          Scrape / extract test tool
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
