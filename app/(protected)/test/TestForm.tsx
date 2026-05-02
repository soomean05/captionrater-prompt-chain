"use client";

import { useEffect, useMemo, useState } from "react";
import type { HumorFlavor } from "@/lib/db/flavors";
import { captionsFromRecords } from "@/lib/api/almostcrackd-pipeline";

const SAMPLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400";

function IconSpark(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function IconCopy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" {...props}>
      <path
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m4 12h2a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type GenResult =
  | { ok: true; captions: string[] }
  | { ok: false; error: string };

export function TestForm({ flavors }: { flavors: HumorFlavor[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE_URL);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const previewSrc = filePreviewUrl ?? imageUrl.trim();

  async function copyCaption(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      setCopiedIndex(null);
    }
  }

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
      let data: { ok?: boolean; captions?: unknown[]; error?: string };
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/15" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/12" />

        <div className="relative mb-6 flex items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
            <IconSpark className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
              Generate captions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a humor flavor and an image. We run five parallel
              generate-captions calls (same minimal body plus optional{" "}
              <code className="rounded bg-muted px-1 text-[0.68rem]">count</code>
              ) and merge distinct lines, with a ~14s total budget for that batch.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-5">
          <div>
            <label
              htmlFor="flavor_id"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Humor flavor
            </label>
            <select
              id="flavor_id"
              name="flavor_id"
              required
              value={selectedFlavorId}
              onChange={(e) => setSelectedFlavorId(e.target.value)}
              className="input-base w-full border-muted bg-background shadow-inner"
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
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
              className="input-base w-full border-muted bg-background shadow-inner"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Or drag in a file — we&apos;ll use the Assignment 5 presigned
              upload path when you attach an image.
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/40 p-5 transition-colors hover:border-violet-400/35 hover:bg-muted/60 dark:hover:border-violet-500/35">
            <label
              htmlFor="image_file"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Image file{" "}
              <span className="font-normal lowercase text-muted-foreground/80">
                (optional)
              </span>
            </label>
            <input
              id="image_file"
              name="image_file"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageFile(f);
              }}
            />
          </div>

          {(filePreviewUrl || imageUrl.trim()) && previewSrc ? (
            <div className="rounded-xl border border-border bg-background/80 p-3 shadow-inner backdrop-blur-sm dark:bg-muted/30">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="Selected test image"
                className="aspect-video max-h-52 w-full rounded-lg object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl hover:shadow-violet-500/30 disabled:opacity-55 dark:from-violet-500 dark:to-fuchsia-500 dark:shadow-fuchsia-500/15"
          >
            <IconSpark className="h-4 w-4 transition group-hover:scale-110" />
            {pending ? "Dreaming up captions…" : "Generate captions"}
          </button>
        </form>
      </section>

      <section className="flex min-h-[28rem] flex-col rounded-2xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="mb-6 flex flex-col gap-1 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
              Results
            </h2>
            <p className="text-sm text-muted-foreground">
              Variants ranked as separate cards below.
            </p>
          </div>
          {pending ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>
              Working…
            </span>
          ) : null}
        </div>

        <div className="min-h-[12rem] flex-1">
          {result === null && !pending ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 px-6 py-14 text-center">
              <IconSpark className="mb-3 h-8 w-8 text-violet-500/70 dark:text-violet-400/80" />
              <p className="max-w-[16rem] text-sm text-muted-foreground">
                Run a generation — your captions will land here with neat
                copy buttons.
              </p>
            </div>
          ) : pending ? (
            <div className="animate-pulse space-y-6">
              <div className="flex gap-3">
                <div className="h-16 w-20 rounded-lg bg-muted" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="h-3 w-1/4 rounded-full bg-muted" />
                  <div className="h-3 w-3/4 rounded-full bg-muted" />
                </div>
              </div>
              {[1, 2, 3, 4, 5].map((k) => (
                <div
                  key={k}
                  className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"
                >
                  <div className="h-3 w-full rounded-full bg-muted" />
                  <div className="h-3 max-w-[88%] rounded-full bg-muted" />
                  <div className="h-3 w-4/6 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : result && !result.ok ? (
            <div className="alert-error rounded-xl border px-5 py-4">
              <p className="font-medium">Something went wrong</p>
              <p className="mt-2">{result.error}</p>
            </div>
          ) : result && result.ok ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-4">
                {selectedFlavor ? (
                  <div className="inline-flex flex-col rounded-xl border border-border bg-muted/25 px-4 py-3">
                    <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      Flavor
                    </span>
                    <span className="font-medium text-card-foreground">
                      {selectedFlavor.name ?? selectedFlavor.id}
                    </span>
                  </div>
                ) : null}
                <div className="inline-flex flex-col rounded-xl border border-transparent bg-muted/40 px-4 py-3">
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    Returned
                  </span>
                  <span className="font-medium tabular-nums text-card-foreground">
                    {result.captions.length}{" "}
                    {result.captions.length === 1 ? "caption" : "captions"}
                  </span>
                </div>
              </div>

              {previewSrc ? (
                <div className="overflow-hidden rounded-xl border border-border bg-linear-to-br from-muted/40 to-muted/80 shadow-inner dark:from-muted/20 dark:to-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt="Test context"
                    className="aspect-[16/7] max-h-44 w-full object-cover object-center"
                  />
                </div>
              ) : null}

              <div>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Generated captions
                  </p>
                  {result.captions.length > 1 ? (
                    <span className="text-xs text-muted-foreground">
                      Tip: copy the best lines into your editor
                    </span>
                  ) : null}
                </div>
                {result.captions?.length ? (
                  <ul className="flex flex-col gap-3">
                    {result.captions.map((c, i) => (
                      <li
                        key={`${i}-${c.slice(0, 48)}`}
                        className="group relative flex gap-4 rounded-xl border border-border bg-linear-to-br from-background to-muted/35 p-4 shadow-sm ring-1 ring-black/[0.03] transition hover:border-violet-300/55 hover:shadow-md hover:shadow-violet-500/5 dark:border-border dark:from-card dark:to-muted/25 dark:hover:border-violet-500/30"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white shadow-sm">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                            {c}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Copy caption ${i + 1}`}
                          onClick={() => void copyCaption(c, i)}
                          className="shrink-0 self-start rounded-lg border border-transparent p-2 text-muted-foreground transition hover:border-border hover:bg-background hover:text-foreground dark:hover:bg-muted"
                        >
                          <IconCopy className="h-4 w-4" />
                        </button>
                        {copiedIndex === i ? (
                          <span className="absolute right-14 top-3 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Copied
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    No captions in response.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
