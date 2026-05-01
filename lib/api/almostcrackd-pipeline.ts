/**
 * Assignment 5 AlmostCrackd REST pipeline (from production client at almostcrackd.ai):
 * - POST /pipeline/generate-presigned-url  { contentType }
 * - POST /pipeline/upload-image-from-url   { imageUrl, isCommonUse? }  → { imageId }
 * - POST /pipeline/generate-captions      { imageId, ... }
 *
 * No guessed /caption routes. One request per step; on 405 we surface the exact URL and stop.
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

  const text = await res.text();

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
    return {
      ok: false,
      status: res.status,
      endpoint,
      message: `AlmostCrackd non-JSON response (${res.status}) at ${endpoint}: ${text.slice(0, 400)}`,
    };
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

  return { ok: true, data: json as T };
}

/** Presigned URL step (Assignment 5); use when not using upload-image-from-url. */
export async function generatePresignedUrl(
  contentType: string,
  accessToken: string
) {
  return pipelinePost<{
    presignedUrl?: string;
    uploadUrl?: string;
    cdnUrl?: string;
    [key: string]: unknown;
  }>("/pipeline/generate-presigned-url", { contentType }, accessToken);
}

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

export async function generateCaptionsForImage(
  imageId: string,
  accessToken: string,
  options?: { prompt?: string }
) {
  const body: Record<string, unknown> = { imageId };
  if (options?.prompt?.trim()) {
    body.prompt = options.prompt.trim();
  }
  return pipelinePost<unknown>("/pipeline/generate-captions", body, accessToken);
}

export function normalizePipelineCaptions(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const arr = o.captions;
    if (Array.isArray(arr)) {
      return arr
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const results = o.results;
    if (Array.isArray(results)) {
      return results
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}
