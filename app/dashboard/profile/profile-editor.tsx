"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BrandProfile } from "@/types/brandProfile";

type LoadedProfile = BrandProfile & { source_url: string | null; updated_at: string };

type Status = "loading" | "empty" | "ready" | "error";

const TONE_MAX = 5;
const TONE_MIN = 3;
const KEYWORDS_MAX = 10;
const KEYWORDS_MIN = 5;

function ChipList({
  label,
  values,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  min: number;
  max: number;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addChip() {
    const trimmed = draft.trim();
    if (!trimmed || values.length >= max) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  function removeChip(index: number) {
    if (values.length <= min) return;
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {values.map((value, i) => (
          <span
            key={`${value}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm bg-zinc-50 dark:bg-zinc-900"
          >
            {value}
            <button
              type="button"
              onClick={() => removeChip(i)}
              disabled={values.length <= min}
              aria-label={`Remove ${value}`}
              className="text-zinc-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          disabled={values.length >= max}
          placeholder={values.length >= max ? `Max ${max} ${label.toLowerCase()}` : placeholder}
          className="flex-1 border rounded px-3 py-1.5 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addChip}
          disabled={!draft.trim() || values.length >= max}
          className="border rounded px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {values.length} / {max} · minimum {min}
      </p>
    </div>
  );
}

function EditableList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  function updateItem(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)));
  }

  function removeItem(index: number) {
    if (values.length <= 1) return;
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {values.map((value, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => updateItem(i, e.target.value)}
            className="flex-1 border rounded px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            disabled={values.length <= 1}
            aria-label="Remove"
            className="border rounded px-2 text-sm text-zinc-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="self-start border rounded px-3 py-1.5 text-sm"
      >
        + Add
      </button>
      {values.length === 0 && <p className="text-xs text-zinc-500">{placeholder}</p>}
    </div>
  );
}

export default function ProfileEditor() {
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<BrandProfile | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/brand-profile");
        if (cancelled) return;

        if (res.status === 404) {
          setStatus("empty");
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          setLoadError(body.error ?? `Request failed with status ${res.status}`);
          setStatus("error");
          return;
        }

        const data: LoadedProfile = await res.json();
        const { source_url, updated_at: _updatedAt, ...rest } = data;
        void _updatedAt;
        setProfile(rest);
        setSavedSnapshot(rest);
        setSourceUrl(source_url);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setLoadError("Request failed — check the console/network tab.");
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = profile !== null && savedSnapshot !== null &&
    JSON.stringify(profile) !== JSON.stringify(savedSnapshot);

  function updateField<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSavedMessage(null);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);

    try {
      const res = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setSaveError(body.error ?? `Save failed with status ${res.status}`);
        return;
      }

      const saved: BrandProfile = await res.json();
      setProfile(saved);
      setSavedSnapshot(saved);
      setSavedMessage("Saved.");
    } catch {
      setSaveError("Save failed — check the console/network tab.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReExtract() {
    if (!sourceUrl) return;

    const confirmed = window.confirm(
      "Re-extracting will overwrite the fields below with a fresh extraction from your site. Any unsaved edits will be lost. Continue?"
    );
    if (!confirmed) return;

    setExtracting(true);
    setExtractError(null);
    setSavedMessage(null);

    try {
      const res = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setExtractError(body.error ?? `Extraction failed with status ${res.status}`);
        return;
      }

      const fresh: BrandProfile = await res.json();
      setProfile(fresh);
      setSavedSnapshot(fresh);
    } catch {
      setExtractError("Extraction failed — check the console/network tab.");
    } finally {
      setExtracting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-zinc-500">Loading your brand profile...</p>;
  }

  if (status === "error") {
    return <p className="text-red-600">{loadError}</p>;
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Brand profile</h1>
        <p className="text-zinc-500">
          You don&apos;t have a brand profile yet. Extract one from your website first.
        </p>
        <Link href="/scrape-test" className="underline text-sm w-fit">
          Go to extraction tool
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Brand profile</h1>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReExtract}
              disabled={!sourceUrl || extracting}
              className="border rounded px-3 py-1.5 text-sm disabled:opacity-50"
              title={sourceUrl ?? "No source URL on record for this profile"}
            >
              {extracting ? "Re-extracting..." : "Re-extract from URL"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="bg-black text-white rounded px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
          {saveError && <p className="text-red-600 text-xs">{saveError}</p>}
          {extractError && <p className="text-red-600 text-xs">{extractError}</p>}
          {savedMessage && !isDirty && <p className="text-green-700 text-xs">{savedMessage}</p>}
          {isDirty && !saving && <p className="text-amber-600 text-xs">Unsaved changes</p>}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Identity</h2>
        <label className="flex flex-col gap-1 text-sm">
          Business name
          <input
            type="text"
            value={profile.business_name}
            onChange={(e) => updateField("business_name", e.target.value)}
            className="border rounded px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vertical
          <input
            type="text"
            value={profile.vertical}
            onChange={(e) => updateField("vertical", e.target.value)}
            className="border rounded px-3 py-1.5"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Voice</h2>
        <ChipList
          label="tone descriptors"
          values={profile.tone_descriptors}
          onChange={(next) => updateField("tone_descriptors", next)}
          min={TONE_MIN}
          max={TONE_MAX}
          placeholder="Add a tone descriptor..."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Audience</h2>
        <textarea
          value={profile.target_audience}
          onChange={(e) => updateField("target_audience", e.target.value)}
          rows={3}
          className="border rounded px-3 py-2 text-sm"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Positioning</h2>
        <EditableList
          values={profile.value_props}
          onChange={(next) => updateField("value_props", next)}
          placeholder="No value props yet — add one."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Keywords</h2>
        <ChipList
          label="keywords"
          values={profile.keywords}
          onChange={(next) => updateField("keywords", next)}
          min={KEYWORDS_MIN}
          max={KEYWORDS_MAX}
          placeholder="Add a keyword..."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Example phrases</h2>
        <p className="text-xs text-zinc-500">
          Reference material pulled from your site&apos;s own voice — refreshed via re-extraction, not edited directly.
        </p>
        <div className="flex flex-col gap-2">
          {profile.example_phrases.map((phrase, i) => (
            <blockquote
              key={i}
              className="border-l-2 pl-3 italic text-sm text-zinc-600 dark:text-zinc-400"
            >
              “{phrase}”
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
