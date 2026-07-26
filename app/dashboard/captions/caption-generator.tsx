"use client";

import { useState } from "react";

const TOPIC_SUGGESTIONS = [
  "New batch starting",
  "Results announcement",
  "Motivational post",
  "Limited seats left",
  "Weekend workshop",
];

export default function CaptionGenerator() {
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        setCaption(null);
        return;
      }

      setCaption(await res.text());
    } catch {
      setError("Request failed — check the console/network tab.");
      setCaption(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Caption generator</h1>
        <p className="text-zinc-500">
          Tell us what this post is about, and we&apos;ll write it in your brand&apos;s voice.
        </p>
      </div>

      <form onSubmit={generate} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TOPIC_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTopic(suggestion)}
              className="rounded-full border px-3 py-1 text-sm text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            required
            placeholder="What's this post about?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 border rounded-lg px-4 py-3 text-base"
          />
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-black text-white rounded-lg px-6 py-3 text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "Writing..." : "Generate"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {loading && (
        <div className="rounded-2xl border p-8 animate-pulse flex flex-col gap-3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
        </div>
      )}

      {!loading && caption && (
        <div className="rounded-2xl border p-8 bg-zinc-50 dark:bg-zinc-900">
          <p className="text-xl leading-relaxed whitespace-pre-wrap font-normal">{caption}</p>
        </div>
      )}
    </div>
  );
}
