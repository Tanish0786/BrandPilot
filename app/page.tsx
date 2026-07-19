import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">BrandPilot</h1>
      <div className="flex gap-4">
        <Link href="/signup" className="bg-black text-white rounded px-4 py-2">
          Sign up
        </Link>
        <Link href="/login" className="border rounded px-4 py-2">
          Log in
        </Link>
      </div>
    </div>
  );
}
