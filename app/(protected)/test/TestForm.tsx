"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  | { ok: true; captions: string[]; fallbackNotice?: string }
  | {
      ok: false;
      error: string;
      rawAlmostCrackdResponse?: string;
      rawOpenAiResponse?: string;
    };

function safeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function flavorDisplayLabel(f: HumorFlavor): string {
  const n = safeText(f.name).trim();
  return n.length > 0 ? n : safeText(f.id);
}

const FLAVOR_LISTBOX_ID = "test-flavor-listbox";

export function TestForm({ flavors }: { flavors: HumorFlavor[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [selectedFlavorId, setSelectedFlavorId] = useState("");
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE_URL);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const [flavorQueryOpen, setFlavorQueryOpen] = useState(false);
  const [flavorQuery, setFlavorQuery] = useState("");
  const [flavorHighlight, setFlavorHighlight] = useState(0);
  const flavorComboRef = useRef<HTMLDivElement>(null);

  const sortedFlavors = useMemo(() => {
    return [...flavors].sort((a, b) =>
      flavorDisplayLabel(a).localeCompare(flavorDisplayLabel(b), undefined, {
        sensitivity: "base",
      }),
    );
  }, [flavors]);

  const filteredFlavors = useMemo(() => {
    const q = flavorQuery.trim().toLowerCase();
    if (!q) return sortedFlavors;
    return sortedFlavors.filter((f) => {
      const label = flavorDisplayLabel(f).toLowerCase();
      return label.includes(q) || safeText(f.id).toLowerCase().includes(q);
    });
  }, [sortedFlavors, flavorQuery]);

  const flavorHighlightBounded =
    filteredFlavors.length === 0
      ? 0
      : Math.min(flavorHighlight, filteredFlavors.length - 1);

  useEffect(() => {
    function onPointerDown(ev: PointerEvent) {
      if (
        flavorComboRef.current &&
        !flavorComboRef.current.contains(ev.target as Node)
      ) {
        setFlavorQueryOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

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
    flavors.find((f) => safeText(f.id) === selectedFlavorId) ?? null;

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

  function commitFlavorPick(f: HumorFlavor) {
    setSelectedFlavorId(safeText(f.id));
    setFlavorQuery(flavorDisplayLabel(f));
    setFlavorQueryOpen(false);
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
      let data: {
        ok?: boolean;
        captions?: unknown[];
        fallbackNotice?: unknown;
        error?: string;
        rawAlmostCrackdResponse?: unknown;
        rawOpenAiResponse?: unknown;
      };
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
          rawAlmostCrackdResponse:
            typeof data.rawAlmostCrackdResponse === "string"
              ? data.rawAlmostCrackdResponse
              : undefined,
          rawOpenAiResponse:
            typeof data.rawOpenAiResponse === "string"
              ? data.rawOpenAiResponse
              : undefined,
        });
        setPending(false);
        return;
      }

      const capsRaw = Array.isArray(data.captions) ? data.captions : [];
      setResult({
        ok: true,
        captions: captionsFromRecords(capsRaw),
        fallbackNotice:
          typeof data.fallbackNotice === "string" ? data.fallbackNotice : undefined,
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
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-5">
          <div ref={flavorComboRef}>
            <label
              htmlFor="flavor_query"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Humor flavor
            </label>
            <p className="mb-2 text-[0.8125rem] text-muted-foreground">
              Search by name or paste a flavor id, then choose a row below.
            </p>
            <div className="relative">
              <input
                id="flavor_query"
                type="text"
                name="flavor_query"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={FLAVOR_LISTBOX_ID}
                aria-expanded={flavorQueryOpen}
                autoComplete="off"
                value={flavorQuery}
                onChange={(e) => {
                  setFlavorHighlight(0);
                  setFlavorQuery(e.target.value);
                  setSelectedFlavorId("");
                  setFlavorQueryOpen(true);
                }}
                onFocus={() => setFlavorQueryOpen(true)}
                onKeyDown={(e) => {
                  if (!flavorQueryOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
                    setFlavorQueryOpen(true);
                  }
                  if (!flavorQueryOpen) return;
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setFlavorQueryOpen(false);
                    return;
                  }
                  const n = filteredFlavors.length;
                  if (n === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setFlavorHighlight((prev) => {
                      const start = Math.min(prev, n - 1);
                      return (start + 1) % n;
                    });
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setFlavorHighlight((prev) => {
                      const start = Math.min(prev, n - 1);
                      return (start - 1 + n) % n;
                    });
                  } else if (e.key === "Enter") {
                    const f = filteredFlavors[flavorHighlightBounded];
                    if (f) {
                      e.preventDefault();
                      commitFlavorPick(f);
                    }
                  }
                }}
                placeholder="Type to filter flavors…"
                className="input-base w-full border-muted bg-background shadow-inner"
              />
              {flavorQueryOpen ? (
                <ul
                  id={FLAVOR_LISTBOX_ID}
                  role="listbox"
                  aria-label="Matching humor flavors"
                  className="absolute z-40 mt-1 max-h-[min(16rem,calc(100vh-12rem))] w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                >
                  {filteredFlavors.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No flavors match{" "}
                      <span className="font-medium text-foreground">
                        &ldquo;{flavorQuery.trim() || "(empty)"}&rdquo;
                      </span>
                    </li>
                  ) : (
                    filteredFlavors.map((f, i) => (
                      <li key={f.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === flavorHighlightBounded}
                          className={
                            i === flavorHighlightBounded
                              ? "flex w-full flex-col items-start gap-0.5 bg-muted/70 px-3 py-2.5 text-left text-sm hover:bg-muted/70"
                              : "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                          }
                          onMouseEnter={() => setFlavorHighlight(i)}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            commitFlavorPick(f);
                          }}
                        >
                          <span className="font-medium text-card-foreground">
                            {flavorDisplayLabel(f)}
                          </span>
                          <span className="font-mono text-[0.7rem] text-muted-foreground">
                            {f.id}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
              <input type="hidden" name="humorFlavorId" value={selectedFlavorId} />
              {selectedFlavorId ? (
                <p className="mt-1.5 font-mono text-[0.7rem] text-muted-foreground">
                  Selected id:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {selectedFlavorId}
                  </span>
                </p>
              ) : null}
            </div>
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
              {result.rawAlmostCrackdResponse ? (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Raw AlmostCrackd response
                  </p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs text-foreground">
                    {result.rawAlmostCrackdResponse}
                  </pre>
                </div>
              ) : null}
              {result.rawOpenAiResponse ? (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Raw OpenAI fallback response
                  </p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-2 text-xs text-foreground">
                    {result.rawOpenAiResponse}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : result && result.ok ? (
            <div className="space-y-5">
              {result.fallbackNotice ? (
                <div className="rounded-xl border border-amber-300/50 bg-amber-100/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
                  {result.fallbackNotice}
                </div>
              ) : null}
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
