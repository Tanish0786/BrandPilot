"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuestionnairePage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [offer, setOffer] = useState("");
  const [customers, setCustomers] = useState("");
  const [vibe, setVibe] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [existingText, setExistingText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          offer,
          customers,
          vibe,
          differentiator,
          existing_text: existingText,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(body.error ?? `Request failed with status ${res.status}`);
        return;
      }

      router.push("/dashboard/profile");
    } catch {
      setError("Request failed — check the console/network tab.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-5">
        <h1 className="text-2xl font-semibold">Tell us about your business</h1>
        <p className="text-sm text-zinc-500">
          No website? Answer these in your own words and we&apos;ll build your brand profile from them.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Business name
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          What do you offer / what services do you provide?
          <textarea
            required
            rows={3}
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Who are your typical customers?
          <textarea
            required
            rows={3}
            value={customers}
            onChange={(e) => setCustomers(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Describe your vibe in a few words — how do you want to sound when talking to customers?
          <textarea
            required
            rows={3}
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          What makes you different, or what are you most proud of?
          <textarea
            required
            rows={3}
            value={differentiator}
            onChange={(e) => setDifferentiator(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Optional: paste anything you&apos;ve already written about your business — Instagram bio, WhatsApp
          About text, old flyer text, Google Business description
          <textarea
            rows={4}
            value={existingText}
            onChange={(e) => setExistingText(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {submitting ? "Building your profile..." : "Build my brand profile"}
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
