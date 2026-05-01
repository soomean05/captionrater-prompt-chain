"use client";

import { useState } from "react";
import { generateCaptionsAction } from "./actions";
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

export function TestForm({ flavors }: { flavors: HumorFlavor[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof generateCaptionsAction>
  > | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    const res = await generateCaptionsAction(formData);
    setResult(res);
    setPending(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card-surface p-5">
        <h2 className="mb-4 text-lg font-medium text-card-foreground">
          Generate captions
        </h2>
        <form action={handleSubmit} className="space-y-4">
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
              defaultValue={SAMPLE_IMAGE_URL}
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
            Submit the form to generate captions.
          </p>
        ) : result && "error" in result ? (
          <div className="alert-error p-6">
            {result.error}
          </div>
        ) : result && "captions" in result ? (
          <div className="space-y-4">
            {result.flavor ? (
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  Flavor: {result.flavor.name ?? result.flavor.id}
                </p>
              </div>
            ) : null}
            {result.imageUrl ? (
              <div>
                <p className="mb-2 text-sm font-medium text-card-foreground">
                  Image preview
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.imageUrl}
                  alt="Test image"
                  className="max-h-48 rounded-lg border border-border object-cover"
                />
              </div>
            ) : null}
            {result.steps?.length ? (
              <div>
                <p className="mb-2 text-sm font-medium text-card-foreground">
                  Steps used
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm muted-text">
                  {result.steps.map((s, i) => (
                    <li key={i} className="truncate">
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
                  No captions returned. The API may use a different response
                  shape—check ALMOSTCRACKD_API_URL and network tab.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
