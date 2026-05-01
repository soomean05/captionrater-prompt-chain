"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumorFlavor } from "@/lib/db/flavors";
import { captionsFromRecords } from "@/lib/api/almostcrackd-pipeline";

const SAMPLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400";

type GenResult =
  | { ok: true; captions: string[] }
  | { ok: false; error: string };

export function TestForm({ flavors }: { flavors: HumorFlavor[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE_URL);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const filePreviewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const selectedFlavor =
    flavors.find((f) => f.id === selectedFlavorId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlavorId) {
      setResult({ ok: false, error: "Select a humor flavor." });
      return;
    }
    setPending(true);
    setResult(null);
    try {
      let res: Response;

      if (imageFile && imageFile.size > 0) {
        const fd = new FormData();
        fd.append("humorFlavorId", selectedFlavorId);
        fd.append("image", imageFile);
        res = await fetch("/api/test-flavor/generate", {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
      } else {
        res = await fetch("/api/test-flavor/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            humorFlavorId: selectedFlavorId,
            imageUrl,
          }),
        });
      }
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

      const capsRaw = Array.isArray(data.captions) ? data.captions : [];
      setResult({
        ok: true,
        captions: captionsFromRecords(capsRaw),
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

  const previewSrc = filePreviewUrl ?? imageUrl;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="card-surface p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            {selectedFlavor ? (
              <p className="mt-3 text-sm text-card-foreground">
                <span className="muted-text">Flavor:</span>{" "}
                <span className="font-medium">
                  {selectedFlavor.name ?? selectedFlavor.id}
                </span>
              </p>
            ) : null}
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
              required={!(imageFile && imageFile.size > 0)}
              className="input-base w-full"
            />
            <p className="mt-1 text-xs muted-text">
              Or upload an image file below.
            </p>
          </div>

          <div>
            <label
              htmlFor="image_file"
              className="mb-1 block text-sm font-medium text-card-foreground"
            >
              Image file (optional)
            </label>
            <input
              id="image_file"
              name="image_file"
              type="file"
              accept="image/*"
              className="input-base w-full text-sm file:mr-3"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
              }}
            />
          </div>

          {(filePreviewUrl || imageUrl.trim()) ? (
            <div>
              <p className="mb-2 text-sm font-medium text-card-foreground">
                Image preview
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Selected test image"
                className="max-h-52 w-full rounded-lg border border-border object-contain bg-muted/30"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Generating…" : "Generate captions"}
          </button>
        </form>
      </section>

      <section className="border-t border-border pt-10">
        {result === null && !pending ? (
          <p className="empty-state rounded-xl border border-dashed border-border p-8 text-center text-sm muted-text">
            Generated captions will appear here.
          </p>
        ) : result && !result.ok ? (
          <div className="alert-error rounded-xl p-5">
            {result.error}
          </div>
        ) : result && result.ok ? (
          <div>
            <p className="mb-4 text-sm font-medium text-card-foreground">
              Generated captions
            </p>
            {result.captions?.length ? (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {result.captions.map((c, i) => (
                  <li
                    key={i}
                    className="px-4 py-3 text-sm leading-relaxed text-card-foreground"
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
        ) : null}
      </section>
    </div>
  );
}
