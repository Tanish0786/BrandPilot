"use client";

import { useState } from "react";
import type { BrandProfile } from "@/types/brandProfile";

export default function ScrapeTestPage() {
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState<string | null>(null);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"scrape" | "extract" | null>(null);

  async function handleScrape() {
    setLoading("scrape");
    setError(null);
    setRawText(null);
    setProfile(null);

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

      setRawText(await res.text());
    } catch {
      setError("Request failed — check the console/network tab.");
    } finally {
      setLoading(null);
    }
  }

  async function handleExtract() {
    setLoading("extract");
    setError(null);
    setRawText(null);
    setProfile(null);

    try {
      const res = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }

      setProfile(await res.json());
    } catch {
      setError("Request failed — check the console/network tab.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-8">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Scrape / Extract test</h1>

        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleScrape}
            disabled={loading !== null || !url}
            className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
          >
            {loading === "scrape" ? "Scraping..." : "Scrape (raw text)"}
          </button>
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading !== null || !url}
            className="border rounded px-3 py-2 disabled:opacity-50"
          >
            {loading === "extract" ? "Extracting..." : "Extract profile (JSON)"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      {rawText !== null && (
        <div className="w-full max-w-xl flex flex-col gap-2">
          <p className="text-sm text-zinc-500">{rawText.length} characters</p>
          <pre className="whitespace-pre-wrap border rounded p-4 text-sm bg-zinc-50 dark:bg-zinc-900">
            {rawText}
          </pre>
        </div>
      )}

      {profile !== null && (
        <div className="w-full max-w-xl flex flex-col gap-2">
          <p className="text-sm text-zinc-500">Extracted brand profile</p>
          <pre className="whitespace-pre-wrap border rounded p-4 text-sm bg-zinc-50 dark:bg-zinc-900">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
