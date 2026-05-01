/**
 * Assignment 5 AlmostCrackd REST pipeline.
 * Base URL: ALMOSTCRACKD_API_BASE (default https://api.almostcrackd.ai)
 *
 * Flow A — file upload:
 *   1. POST /pipeline/generate-presigned-url { contentType }
 *   2. PUT presigned URL (bytes, Content-Type: file.type)
 *   3. POST /pipeline/upload-image-from-url { imageUrl: cdnUrl, isCommonUse: false }
 *   4. POST /pipeline/generate-captions { imageId, humorFlavorId }
 *
 * Flow B — public URL only (Test page):
 *   POST /pipeline/upload-image-from-url { imageUrl, isCommonUse: false }
 *   POST /pipeline/generate-captions { imageId, humorFlavorId }
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

async function finalizeAlmostCrackdFetch(
  res: Response,
  endpoint: string
): Promise<PipelinePostSuccess<unknown> | PipelinePostFailure> {
  const text = await res.text();
  console.log("AlmostCrackd status:", res.status);
  console.log("AlmostCrackd raw response:", text);

  if (res.status === 405) {
    return {
      ok: false,
      status: 405,
      endpoint,
      message: `AlmostCrackd returned 405 METHOD NOT ALLOWED at: ${endpoint}`,
    };
  }

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`AlmostCrackd returned non-JSON: ${text}`);
  }

  if (!res.ok) {
    const o = json as Record<string, unknown> | null;
    const msg =
      (typeof o?.message === "string" && o.message) ||
      (typeof o?.statusMessage === "string" && o.statusMessage) ||
      text.slice(0, 400);
    return {
      ok: false,
      status: res.status,
      endpoint,
      message: `AlmostCrackd error ${res.status} at ${endpoint}: ${msg}`,
    };
  }

  return { ok: true, data: json };
}

/** Pull caption strings out of heterogeneous AlmostCrackd JSON shapes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractCaptions(json: any): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let candidates: any =
    json?.captions ??
    json?.data?.captions ??
    json?.generated_captions ??
    json?.results ??
    json?.data ??
    json?.caption_request?.captions ??
    json?.captionRequest?.captions ??
    json?.llm_responses ??
    json?.llm_model_responses ??
    json?.caption_requests ??
    [];

  if (
    (!Array.isArray(candidates) || candidates.length === 0) &&
    Array.isArray(json?.caption_requests)
  ) {
    candidates = json.caption_requests;
  }

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((item) => {
      if (typeof item === "string") return item;
      return (
        item?.caption ??
        item?.content ??
        item?.text ??
        item?.response ??
        item?.output ??
        item?.llm_response ??
        item?.message ??
        ""
      );
    })
    .filter(Boolean)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
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
  console.log("AlmostCrackd presigned PUT status:", res.status);

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
 * Step 4 — captions only use imageId + humorFlavorId (AlmostCrackd loads flavor/steps).
 */
export async function requestGenerateCaptions(
  accessToken: string,
  params: { imageId: string; humorFlavorId: string }
): Promise<PipelinePostSuccess<unknown> | PipelinePostFailure> {
  const baseUrl = getAlmostCrackdApiBase();
  const endpoint = `${baseUrl}/pipeline/generate-captions`;

  const payload = {
    imageId: params.imageId,
    humorFlavorId: params.humorFlavorId,
  };

  console.log("generate-captions payload object:", payload);
  console.log(
    "generate-captions payload JSON:",
    JSON.stringify(payload, null, 2)
  );

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  return finalizeAlmostCrackdFetch(res, endpoint);
}
