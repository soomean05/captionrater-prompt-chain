/**
 * Assignment 5 AlmostCrackd REST pipeline (from production client at almostcrackd.ai):
 * - POST /pipeline/generate-presigned-url  { contentType }
 * - POST /pipeline/upload-image-from-url   { imageUrl, isCommonUse? }  → { imageId }
 * - POST /pipeline/generate-captions      JSON body via JSON.stringify({ image_id, humor_flavor_id, num_captions, steps })
 *
 * No guessed /caption routes. One request per step; on 405 we surface the exact URL and stop.
 */

import type { HumorFlavorStep } from "@/lib/db/steps";

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

function normalizeStepTemperature(step: HumorFlavorStep): number {
  const raw = step.llm_temperature as unknown as
    | number
    | string
    | null
    | undefined;
  if (raw === null || raw === undefined) return 0.7;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return 0.7;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0.7;
  }
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0.7;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.7;
}

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
  registeredImageId: string,
  accessToken: string,
  params: {
    humorFlavorId: string;
    steps: HumorFlavorStep[];
  }
): Promise<PipelinePostSuccess<unknown> | PipelinePostFailure> {
  const baseUrl = getAlmostCrackdApiBase();
  const endpoint = `${baseUrl}/pipeline/generate-captions`;

  const payload = {
    image_id: registeredImageId,
    humor_flavor_id: params.humorFlavorId,
    num_captions: 5,
    steps: params.steps.map((step) => ({
      order_by: step.order_by,
      llm_system_prompt: step.llm_system_prompt ?? "",
      llm_user_prompt: step.llm_user_prompt ?? "",
      description: step.description ?? "",
      llm_temperature: normalizeStepTemperature(step),
      llm_input_type_id: step.llm_input_type_id,
      llm_output_type_id: step.llm_output_type_id,
      llm_model_id: step.llm_model_id,
      humor_flavor_step_type_id: step.humor_flavor_step_type_id,
    })),
  };

  console.log(
    "AlmostCrackd generate-captions payload:",
    JSON.stringify(payload, null, 2)
  );

  const serialized = JSON.stringify(payload);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: serialized,
  });

  return finalizeAlmostCrackdFetch(res, endpoint);
}
