"use client";

import { useState } from "react";

export default function ScrapeTestPage() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setText(null);

    try {
      const res = await fetch("/api/scrape-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }

      setText(await res.text());
    } catch {
      setError("Request failed — check the console/network tab.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Scrape test</h1>

        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {loading ? "Scraping..." : "Scrape"}
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {text !== null && (
        <div className="w-full max-w-xl flex flex-col gap-2">
          <p className="text-sm text-zinc-500">{text.length} characters</p>
          <pre className="whitespace-pre-wrap border rounded p-4 text-sm bg-zinc-50 dark:bg-zinc-900">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
}
