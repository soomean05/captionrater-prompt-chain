/**
 * Assignment 5 AlmostCrackd REST pipeline.
 * Base URL: ALMOSTCRACKD_API_BASE (default https://api.almostcrackd.ai)
 *
 * Flow A — file upload:
 *   1. POST /pipeline/generate-presigned-url { contentType }
 *   2. PUT presigned URL (bytes, Content-Type: file.type)
 *   3. POST /pipeline/upload-image-from-url { imageUrl: cdnUrl, isCommonUse: false }
 *   4. POST /pipeline/generate-captions body: JSON.stringify({ imageId, humorFlavorId }) (number or UUID string)
 *
 * Flow B — public URL only (Test page):
 *   POST /pipeline/upload-image-from-url { imageUrl, isCommonUse: false }
 *   POST /pipeline/generate-captions — only imageId + humorFlavorId (never null)
 *
 * Test harness (`lib/test-flavor-captions.ts`) defaults to sequential calls **without**
 * optional `count` because AlmostCrackd has returned 500s parsing model prose as JSON when
 * `count`>1. Opt in: `ALMOSTCRACKD_GENERATE_BULK=1` (single call + count) or
 * `ALMOSTCRACKD_PARALLEL_GENERATE=1` (parallel minimal calls).
 *
 * After `upload-image-from-url`, the test flow waits `ALMOSTCRACKD_POST_UPLOAD_DELAY_MS` (default
 * 1200) before generate-captions so `images.almostcrackd.ai` can serve the new object.
 */

export function getAlmostCrackdApiBase(): string {
  return (process.env.ALMOSTCRACKD_API_BASE ?? "https://api.almostcrackd.ai").replace(
    /\/$/,
    ""
  );
}

export type PipelinePostFailure = {
  ok: false;
  status: number;
  endpoint: string;
  message: string;
};

export type PipelinePostSuccess<T> = { ok: true; data: T };

function tryParseAlmostCrackdBody(text: string): unknown | undefined {
  const t = text.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return undefined;
  }
}

async function finalizeAlmostCrackdFetch(
  res: Response,
  endpoint: string
): Promise<PipelinePostSuccess<unknown> | PipelinePostFailure> {
  const text = await res.text();
  if (process.env.DEBUG_ALMOSTCRACKD === "1") {
    console.log("AlmostCrackd status:", res.status, endpoint);
    console.log("AlmostCrackd raw response:", text);
  } else {
    console.log(
      "AlmostCrackd",
      res.status,
      endpoint.replace(getAlmostCrackdApiBase(), ""),
      `${text.length}b`
    );
  }

  if (res.status === 405) {
    return {
      ok: false,
      status: 405,
      endpoint,
      message: `AlmostCrackd returned 405 METHOD NOT ALLOWED at: ${endpoint}`,
    };
  }

  const json = tryParseAlmostCrackdBody(text);

  if (!res.ok) {
    const o =
      json && typeof json === "object"
        ? (json as Record<string, unknown>)
        : null;
    const msg =
      (o && typeof o.message === "string" && o.message) ||
      (o && typeof o.statusMessage === "string" && o.statusMessage) ||
      (json === undefined
        ? text.trim().slice(0, 500)
        : JSON.stringify(json).slice(0, 400));
    return {
      ok: false,
      status: res.status,
      endpoint,
      message: `AlmostCrackd error ${res.status} at ${endpoint}: ${msg}`,
    };
  }

  if (json === undefined && text.trim() !== "") {
    return {
      ok: false,
      status: res.status,
      endpoint,
      message: `AlmostCrackd returned ${res.status} with non-JSON body at ${endpoint}: ${text.trim().slice(0, 400)}`,
    };
  }

  return { ok: true, data: json ?? null };
}

/** One caption record/string → plain string before trim/replace/display. */
export function normalizeCaption(item: unknown): string {
  if (typeof item === "string") return item;

  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;

    if (Array.isArray(record.captions) && record.captions.length > 0) {
      const parts = record.captions
        .map((c) =>
          normalizeCaption(c).replace(/^["']|["']$/g, "").trim()
        )
        .filter(Boolean);
      if (parts.length) return parts.join("\n\n");
    }

    const value =
      record.content ??
      record.caption ??
      record.generatedCaption ??
      record.generated_text ??
      record.output ??
      record.value ??
      record.text ??
      record.response ??
      "";

    return typeof value === "string" ? value : String(value ?? "");
  }

  return "";
}

function dedupePreserveOrder(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^(\d+[.)]\s+|[-*•]+\s+)/, "").trim();
}

/** Split a single caption blob into multiple captions (APIs often return one newline-/bullet-separated string). */
export function expandCompositeCaptionStrings(strings: string[]): string[] {
  const out: string[] = [];

  for (const raw of strings) {
    const bare = raw.replace(/^["']|["']$/g, "").trim();
    if (!bare) continue;

    if (bare.startsWith("[") && bare.endsWith("]")) {
      try {
        const parsed = JSON.parse(bare) as unknown;
        if (Array.isArray(parsed)) {
          for (const el of parsed) {
            const t = normalizeCaption(el).replace(/^["']|["']$/g, "").trim();
            if (t) out.push(...expandCompositeCaptionStrings([t]));
          }
          continue;
        }
      } catch {
        /* treat as literal text */
      }
    }

    const paragraphs = bare.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      out.push(...expandCompositeCaptionStrings(paragraphs));
      continue;
    }

    const block = paragraphs[0] ?? bare;
    const rawLines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length <= 1) {
      out.push(block.trim());
      continue;
    }

    const listLikeCount = rawLines.filter((ln) =>
      /^(\d+[.)]\s+|[-*•]\s+)/.test(ln)
    ).length;
    const shortLinesOk = rawLines.every((ln) => ln.length <= 360);

    if (
      rawLines.length >= 2 &&
      (listLikeCount >= 2 || listLikeCount >= Math.ceil(rawLines.length * 0.5))
    ) {
      out.push(...rawLines.map(stripBulletPrefix).filter(Boolean));
      continue;
    }

    if (rawLines.length >= 2 && rawLines.length <= 12 && shortLinesOk) {
      const stripped = rawLines.map(stripBulletPrefix);
      out.push(...stripped.filter(Boolean));
      continue;
    }

    out.push(block.trim());
  }

  return dedupePreserveOrder(out);
}

/** Normalize AlmostCrackd caption records to display strings (never call .replace on raw objects). */
export function captionsFromRecords(rawCaptions: unknown[]): string[] {
  const strings = rawCaptions
    .map(normalizeCaption)
    .map((caption) =>
      caption.replace(/^["']|["']$/g, "").trim()
    )
    .filter(Boolean);
  return expandCompositeCaptionStrings(strings);
}

/**
 * DFS into common AlmostCrackd wrapper shapes until we collect leaf strings/objects
 * (objects are normalized with content/caption/text). Avoid swallowing sibling arrays—
 * unwrap in fixed priority order and flatten nested caption arrays (array-of-arrays).
 */
function unwrapCaptionRawNodes(root: unknown, out: unknown[]): void {
  if (root === null || root === undefined) return;

  if (typeof root === "string" || typeof root === "number") {
    out.push(typeof root === "number" ? String(root) : root);
    return;
  }

  if (Array.isArray(root)) {
    for (const el of root) unwrapCaptionRawNodes(el, out);
    return;
  }

  if (typeof root !== "object") return;

  const node = root as Record<string, unknown>;

  const unwrapKeys = [
    "captions",
    "caption",
    "generated_captions",
    "captionVariants",
    "caption_variants",
    "variants",
    "choices",
    "outputs",
    "responses",
    "messages",
    "suggestions",
    "items",
    "list",
    "values",
    "data",
    "results",
    "result",
    "payload",
    "output",
    "body",
  ] as const;

  for (const key of unwrapKeys) {
    if (!(key in node)) continue;
    const v = node[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length === 0
    ) {
      continue;
    }

    const before = out.length;
    unwrapCaptionRawNodes(v, out);
    if (out.length > before) return;
    // Empty wrapper — try sibling keys next (e.g. captions:{} + results:[...])
  }

  if (normalizeCaption(node).trim() !== "") {
    out.push(node);
  }
}

/** Pull caption strings from AlmostCrackd responses (including nested wrappers and arrays-of-arrays). */
export function extractCaptions(json: unknown): string[] {
  const rawLeaves: unknown[] = [];
  unwrapCaptionRawNodes(json, rawLeaves);
  return captionsFromRecords(rawLeaves);
}

export async function pipelinePost<T = unknown>(
  path: string,
  body: unknown,
  accessToken: string
): Promise<PipelinePostSuccess<T> | PipelinePostFailure> {
  const base = getAlmostCrackdApiBase();
  const endpoint = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const out = await finalizeAlmostCrackdFetch(res, endpoint);
  if (!out.ok) return out;
  return { ok: true, data: out.data as T };
}

/** Step 1 — Assignment 5 */
export async function generatePresignedUrl(
  contentType: string,
  accessToken: string
) {
  return pipelinePost<Record<string, unknown>>(
    "/pipeline/generate-presigned-url",
    { contentType },
    accessToken
  );
}

export function pickPresignedUrls(data: Record<string, unknown>): {
  presignedUrl?: string;
  cdnUrl?: string;
} {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
  };
  const presignedUrl = pick(
    "presignedUrl",
    "presigned_url",
    "uploadUrl",
    "upload_url",
    "signedUrl",
    "signed_url"
  );
  const cdnUrl = pick(
    "cdnUrl",
    "cdn_url",
    "publicUrl",
    "public_url",
    "imageUrl",
    "image_url",
    "url"
  );
  return { presignedUrl, cdnUrl };
}

/** Step 2 — PUT file bytes (S3-compatible presigned upload; no Bearer). */
export async function putBytesToPresignedUrl(
  presignedUrl: string,
  bytes: Uint8Array,
  contentType: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes as BodyInit,
  });
  const text = await res.text();
  if (process.env.DEBUG_ALMOSTCRACKD === "1") {
    console.log("AlmostCrackd presigned PUT status:", res.status);
  }

  if (!res.ok) {
    return {
      ok: false,
      message: `Presigned PUT failed ${res.status}: ${text.slice(0, 400)}`,
    };
  }
  return { ok: true };
}

/** Step 3 — register CDN URL → imageId */
export async function uploadImageFromUrl(
  imageUrl: string,
  accessToken: string,
  isCommonUse = false
) {
  return pipelinePost<{ imageId?: string; [key: string]: unknown }>(
    "/pipeline/upload-image-from-url",
    { imageUrl, isCommonUse },
    accessToken
  );
}

export function imageIdFromRegisterResponse(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const o = data as Record<string, unknown>;
  const a = o.imageId;
  const b = o.image_id;
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();
  return undefined;
}

/**
 * AlmostCrackd accepts numeric humor flavor IDs (assignment style) OR UUID strings.
 * Do NOT coerce UUID → Number(...) — that yields NaN, JSON.stringify strips it → null → server errors.
 */
export function humorFlavorIdForAlmostCrackd(
  humorFlavorId: string | number
): string | number {
  const raw =
    typeof humorFlavorId === "number"
      ? String(Math.trunc(humorFlavorId))
      : humorFlavorId.trim();
  if (raw === "") {
    throw new Error("humorFlavorId is empty before generate-captions.");
  }
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isSafeInteger(n) && n > 0) return n;
  }
  return raw;
}

/**
 * Step 4 — body is `{ imageId, humorFlavorId }` plus optional single `count` when
 * `desiredCaptionCount` is set (omit count entirely with ALMOSTCRACKD_OMIT_GENERATE_COUNT=1).
 *
 * Retries (same payload): `ALMOSTCRACKD_GENERATE_MAX_RETRIES` = extra attempts after the first
 * (default 2 → 3 tries). Retries on 5xx, 429, and 400 when the message looks like a transient
 * failure to fetch the registered image from AlmostCrackd CDN (e.g. "Error while downloading ...").
 */
function isRetryableGenerateCaptionsFailure(
  out: PipelinePostFailure
): boolean {
  if (out.status >= 500 || out.status === 429) return true;
  if (out.status !== 400) return false;
  const m = out.message.toLowerCase();
  return (
    m.includes("error while downloading") ||
    m.includes("while downloading http") ||
    m.includes("failed to download") ||
    m.includes("could not download")
  );
}

export async function requestGenerateCaptions(
  accessToken: string,
  params: {
    imageId: string;
    humorFlavorId: string | number;
    /** Adds only `count` to the JSON body (not `captionCount`). */
    desiredCaptionCount?: number;
  }
): Promise<PipelinePostSuccess<unknown> | PipelinePostFailure> {
  const baseUrl = getAlmostCrackdApiBase();
  const endpoint = `${baseUrl}/pipeline/generate-captions`;

  const imageId = params.imageId.trim();

  const generatePayload: Record<string, unknown> = {
    imageId,
    humorFlavorId: humorFlavorIdForAlmostCrackd(params.humorFlavorId),
  };

  if (
    process.env.ALMOSTCRACKD_OMIT_GENERATE_COUNT !== "1" &&
    typeof params.desiredCaptionCount === "number" &&
    Number.isFinite(params.desiredCaptionCount) &&
    params.desiredCaptionCount > 1
  ) {
    generatePayload.count = Math.min(
      30,
      Math.floor(params.desiredCaptionCount)
    );
  }

  if (!generatePayload.imageId) {
    throw new Error("Missing imageId before generate-captions.");
  }

  if (
    generatePayload.humorFlavorId === "" ||
    generatePayload.humorFlavorId === undefined ||
    generatePayload.humorFlavorId === null
  ) {
    throw new Error("Missing humorFlavorId before generate-captions.");
  }

  if (process.env.DEBUG_ALMOSTCRACKD === "1") {
    console.log("FINAL generate-captions payload:", generatePayload);
  }

  const bodyJson = JSON.stringify(generatePayload);
  const parsedRetries = Number.parseInt(
    process.env.ALMOSTCRACKD_GENERATE_MAX_RETRIES ?? "2",
    10
  );
  const extraRetries = Number.isFinite(parsedRetries)
    ? Math.min(5, Math.max(0, parsedRetries))
    : 2;
  const maxAttempts = 1 + extraRetries;

  let last: PipelinePostSuccess<unknown> | PipelinePostFailure | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(12_000, 400 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, delayMs));
      if (process.env.DEBUG_ALMOSTCRACKD === "1") {
        console.log(
          "AlmostCrackd generate-captions retry",
          attempt + 1,
          "/",
          maxAttempts
        );
      }
    }

    const captionsRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: bodyJson,
    });

    const out = await finalizeAlmostCrackdFetch(captionsRes, endpoint);
    last = out;
    if (out.ok) return out;

    const retryable = isRetryableGenerateCaptionsFailure(out);
    if (!retryable) return out;
  }

  return last as PipelinePostFailure;
}
