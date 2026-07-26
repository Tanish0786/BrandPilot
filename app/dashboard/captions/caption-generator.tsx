"use client";

import { useState } from "react";

const TOPIC_SUGGESTIONS = [
  "New batch starting",
  "Results announcement",
  "Motivational post",
  "Limited seats left",
  "Weekend workshop",
];

type CaptionStatus = "pending" | "approved" | "edited";

const STATUS_STYLES: Record<CaptionStatus, { border: string; label: string; labelClass: string }> = {
  pending: {
    border: "border-zinc-200 dark:border-zinc-800",
    label: "Pending review",
    labelClass: "text-zinc-500",
  },
  approved: {
    border: "border-green-500",
    label: "✓ Approved",
    labelClass: "text-green-600 font-medium",
  },
  edited: {
    border: "border-amber-500",
    label: "Edited",
    labelClass: "text-amber-600 font-medium",
  },
};

export default function CaptionGenerator() {
  const [topic, setTopic] = useState("");
  const [lastTopic, setLastTopic] = useState("");
  const [caption, setCaption] = useState<string | null>(null);
  const [status, setStatus] = useState<CaptionStatus>("pending");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runGeneration(topicToUse: string) {
    if (!topicToUse.trim() || loading) return;

    setLoading(true);
    setError(null);
    setIsEditing(false);

    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicToUse }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        setCaption(null);
        return;
      }

      setCaption(await res.text());
      setStatus("pending");
      setLastTopic(topicToUse);
    } catch {
      setError("Request failed — check the console/network tab.");
      setCaption(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runGeneration(topic);
  }

  function handleRegenerate() {
    runGeneration(lastTopic);
  }

  function handleApprove() {
    setStatus("approved");
    setIsEditing(false);
  }

  function handleStartEdit() {
    if (!caption) return;
    setEditDraft(caption);
    setIsEditing(true);
  }

  function handleSaveEdit() {
    setCaption(editDraft);
    setStatus("edited");
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  function handleReject() {
    setCaption(null);
    setIsEditing(false);
    setError(null);
  }

  const styles = STATUS_STYLES[status];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Caption generator</h1>
        <p className="text-zinc-500">
          Tell us what this post is about, and we&apos;ll write it in your brand&apos;s voice.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <div className={`rounded-2xl border-2 p-8 bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-5 ${styles.border}`}>
          <p className={`text-sm ${styles.labelClass}`}>{styles.label}</p>

          {isEditing ? (
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={6}
              autoFocus
              className="text-xl leading-relaxed border rounded-lg p-4 bg-white dark:bg-black"
            />
          ) : (
            <p className="text-xl leading-relaxed whitespace-pre-wrap font-normal">{caption}</p>
          )}

          {isEditing ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editDraft.trim()}
                className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Save edit
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="border rounded-lg px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={status === "approved"}
                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                disabled={status === "approved"}
                className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
