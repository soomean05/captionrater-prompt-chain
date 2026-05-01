"use client";

import { useState } from "react";
import type { HumorFlavor } from "@/lib/db/flavors";
import type { HumorFlavorStep } from "@/lib/db/steps";

function getContent(step: HumorFlavorStep | Record<string, unknown>): string {
  const s = step as Record<string, unknown>;
  return (
    (s.llm_user_prompt as string) ??
    (s.description as string) ??
    ""
  );
}

const SAMPLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400";

type GenResult =
  | { ok: true; captions: string[] }
  | { ok: false; error: string };

export function TestForm({
  flavors,
  stepsByFlavorId,
}: {
  flavors: HumorFlavor[];
  /** Optional: steps keyed by flavor id for “steps used” panel without exposing them from the API response */
  stepsByFlavorId: Record<string, HumorFlavorStep[]>;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE_URL);

  const selectedFlavor =
    flavors.find((f) => f.id === selectedFlavorId) ?? null;
  const previewSteps = selectedFlavorId
    ? (stepsByFlavorId[selectedFlavorId] ?? [])
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId) {
      setResult({ ok: false, error: "Select a humor flavor." });
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-flavor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          humorFlavorId: selectedFlavorId,
          imageUrl,
        }),
      });
      let data: { ok?: boolean; captions?: string[]; error?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setResult({
          ok: false,
          error: `Invalid JSON response (${res.status})`,
        });
        setPending(false);
        return;
      }

      if (!res.ok || data.error) {
        setResult({
          ok: false,
          error:
            typeof data.error === "string"
              ? data.error
              : `Request failed (${res.status})`,
        });
        setPending(false);
        return;
      }

      const caps = Array.isArray(data.captions) ? data.captions : [];
      setResult({
        ok: true,
        captions: caps.filter((x): x is string => typeof x === "string"),
      });
    } catch (err) {
      setResult({
        ok: false,
        error:
          err instanceof Error ? err.message : "Caption request failed.",
      });
    }
    setPending(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-medium text-card-foreground">
          Generate captions
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="flavor_id"
              className="mb-1 block text-sm font-medium text-card-foreground"
            >
              Humor flavor
            </label>
            <select
              id="flavor_id"
              name="flavor_id"
              required
              value={selectedFlavorId}
              onChange={(e) => setSelectedFlavorId(e.target.value)}
              className="input-base w-full"
            >
              <option value="">Select a flavor</option>
              {flavors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name ?? f.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="image_url"
              className="mb-1 block text-sm font-medium text-card-foreground"
            >
              Image URL
            </label>
            <input
              id="image_url"
              name="image_url"
              type="url"
              placeholder={SAMPLE_IMAGE_URL}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
              className="input-base w-full"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Generating…" : "Generate captions"}
          </button>
        </form>
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-medium text-card-foreground">
          Results
        </h2>
        {result === null && !pending ? (
          <p className="empty-state p-6">
            Submit the form to generate captions via AlmostCrackd (Assignment 5
            pipeline).
          </p>
        ) : result && !result.ok ? (
          <div className="alert-error p-6">
            {result.error}
          </div>
        ) : result && result.ok ? (
          <div className="space-y-4">
            {selectedFlavor ? (
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  Flavor: {selectedFlavor.name ?? selectedFlavor.id}
                </p>
              </div>
            ) : null}
            {imageUrl ? (
              <div>
                <p className="mb-2 text-sm font-medium text-card-foreground">
                  Image preview
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Test image"
                  className="max-h-48 rounded-lg border border-border object-cover"
                />
              </div>
            ) : null}
            {previewSteps.length ? (
              <div>
                <p className="mb-2 text-sm font-medium text-card-foreground">
                  Steps used
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm muted-text">
                  {previewSteps.map((s, i) => (
                    <li key={s.id ?? i} className="truncate">
                      {getContent(s)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium text-card-foreground">
                Generated captions
              </p>
              {result.captions?.length ? (
                <ul className="space-y-2">
                  {result.captions.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border bg-background p-3 text-sm"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No captions in response.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
