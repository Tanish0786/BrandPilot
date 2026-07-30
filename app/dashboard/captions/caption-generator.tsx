"use client";

import { useState } from "react";

const TOPIC_SUGGESTIONS = [
  "New batch starting",
  "Results announcement",
  "Motivational post",
  "Limited seats left",
  "Weekend workshop",
];

type CaptionStatus = "pending" | "approved" | "edited" | "rejected";
type Mode = "idle" | "edit" | "note-regenerate" | "note-reject";

type ContentPiece = {
  id: string;
  input_prompt: string;
  generated_text: string;
  status: CaptionStatus;
  created_at: string;
};

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
  rejected: {
    border: "border-red-300",
    label: "Rejected",
    labelClass: "text-red-500 font-medium",
  },
};

const TERMINAL_STATUSES: CaptionStatus[] = ["approved", "rejected"];

export default function CaptionGenerator({ initialPieces }: { initialPieces: ContentPiece[] }) {
  const [topic, setTopic] = useState("");
  const [lastTopic, setLastTopic] = useState("");
  const [pieces, setPieces] = useState<ContentPiece[]>(initialPieces);
  const [activeId, setActiveId] = useState<string | null>(
    initialPieces.find((p) => !TERMINAL_STATUSES.includes(p.status))?.id ?? initialPieces[0]?.id ?? null
  );
  const [mode, setMode] = useState<Mode>("idle");
  const [editDraft, setEditDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePiece = pieces.find((p) => p.id === activeId) ?? null;
  const historyPieces = pieces.filter((p) => p.id !== activeId);
  const isLocked = activePiece ? TERMINAL_STATUSES.includes(activePiece.status) : false;

  async function runGeneration(topicToUse: string, note?: string) {
    if (!topicToUse.trim() || loading) return;

    setLoading(true);
    setError(null);
    setMode("idle");
    setNoteDraft("");

    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicToUse, note }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }

      const piece: ContentPiece = await res.json();
      setPieces((prev) => [piece, ...prev]);
      setActiveId(piece.id);
      setLastTopic(topicToUse);
    } catch {
      setError("Request failed — check the console/network tab.");
    } finally {
      setLoading(false);
    }
  }

  async function updateActivePiece(update: {
    status?: CaptionStatus;
    generated_text?: string;
    feedback_note?: string;
  }) {
    if (!activeId) return null;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/content-pieces/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return null;
      }

      const updated: ContentPiece = await res.json();
      setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      return updated;
    } catch {
      setError("Request failed — check the console/network tab.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runGeneration(topic);
  }

  async function handleApprove() {
    await updateActivePiece({ status: "approved" });
  }

  function handleStartEdit() {
    if (!activePiece) return;
    setEditDraft(activePiece.generated_text);
    setMode("edit");
  }

  async function handleSaveEdit() {
    const updated = await updateActivePiece({ generated_text: editDraft, status: "edited" });
    if (updated) setMode("idle");
  }

  function handleStartRegenerateNote() {
    setNoteDraft("");
    setMode("note-regenerate");
  }

  function handleConfirmRegenerate() {
    runGeneration(lastTopic || activePiece?.input_prompt || "", noteDraft.trim() || undefined);
  }

  function handleStartRejectNote() {
    setNoteDraft("");
    setMode("note-reject");
  }

  async function handleConfirmReject() {
    const updated = await updateActivePiece({
      status: "rejected",
      feedback_note: noteDraft.trim() || undefined,
    });
    if (updated) setMode("idle");
  }

  function handleCancelMode() {
    setMode("idle");
  }

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

      {!loading && activePiece && (
        <div
          className={`rounded-2xl border-2 p-8 bg-zinc-50 dark:bg-zinc-900 flex flex-col gap-5 ${STATUS_STYLES[activePiece.status].border}`}
        >
          <p className={`text-sm ${STATUS_STYLES[activePiece.status].labelClass}`}>
            {STATUS_STYLES[activePiece.status].label}
          </p>

          {mode === "edit" ? (
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={6}
              autoFocus
              className="text-xl leading-relaxed border rounded-lg p-4 bg-white dark:bg-black"
            />
          ) : (
            <p className="text-xl leading-relaxed whitespace-pre-wrap font-normal">
              {activePiece.generated_text}
            </p>
          )}

          {isLocked ? null : mode === "edit" ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editDraft.trim() || saving}
                className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save edit"}
              </button>
              <button
                type="button"
                onClick={handleCancelMode}
                disabled={saving}
                className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          ) : mode === "note-regenerate" ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-500">Want to add anything? (optional)</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="more playful, mention weekend hours"
                  autoFocus
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleConfirmRegenerate}
                  disabled={loading}
                  className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 shrink-0"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleCancelMode}
                  className="border rounded-lg px-4 py-2 text-sm shrink-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : mode === "note-reject" ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-zinc-500">Want to add anything? (optional)</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="wrong tone, too generic"
                  autoFocus
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={saving}
                  className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40 shrink-0"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleCancelMode}
                  className="border rounded-lg px-4 py-2 text-sm shrink-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving}
                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                disabled={saving}
                className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleStartRegenerateNote}
                disabled={loading || saving}
                className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleStartRejectNote}
                disabled={saving}
                className="border border-red-300 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {historyPieces.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500">History</h2>
          <div className="flex flex-col gap-3">
            {historyPieces.map((piece) => (
              <div
                key={piece.id}
                className={`rounded-xl border p-4 flex flex-col gap-2 ${STATUS_STYLES[piece.status].border}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">{piece.input_prompt}</p>
                  <p className={`text-xs ${STATUS_STYLES[piece.status].labelClass}`}>
                    {STATUS_STYLES[piece.status].label}
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {piece.generated_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
