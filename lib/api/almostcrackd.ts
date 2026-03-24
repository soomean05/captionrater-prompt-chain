/**
 * AlmostCrackd API client for caption generation.
 * Uses api.almostcrackd.ai - payload shape may need adjustment per actual API docs.
 */

const BASE_URL = "https://api.almostcrackd.ai";

export type GenerateCaptionsInput = {
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
  steps?: string[];
};

export type GenerateCaptionsResult = {
  captions: string[];
  raw?: unknown;
};

function normalizeCaptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return (
            (obj.content as string) ??
            (obj.caption as string) ??
            (obj.text as string) ??
            (obj.captions as string)?.[0] ??
            ""
          );
        }
        return "";
      })
      .filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const arr =
      (obj.captions as string[]) ??
      (obj.content as string[]) ??
      (obj.results as string[]);
    if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string");
    const single =
      (obj.content as string) ??
      (obj.caption as string) ??
      (obj.text as string);
    if (typeof single === "string") return [single];
  }
  return [];
}

export async function generateCaptions(
  input: GenerateCaptionsInput
): Promise<{ data?: GenerateCaptionsResult; error?: string }> {
  const apiKey = process.env.ALMOSTCRACKD_API_KEY;
  const baseUrl = process.env.ALMOSTCRACKD_API_URL ?? BASE_URL;
  const path = process.env.ALMOSTCRACKD_API_PATH ?? "/caption";

  const body: Record<string, unknown> = {};
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.imageBase64) body.image_base64 = input.imageBase64;
  if (input.prompt) body.prompt = input.prompt;
  if (input.steps?.length) body.steps = input.steps;
  if (Object.keys(body).length === 0) {
    return { error: "Provide image_url or image_base64, and prompt or steps" };
  }

  const endpoint = baseUrl.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return {
        error: res.ok
          ? "Invalid JSON response"
          : `API error: ${res.status} ${res.statusText}`,
      };
    }

    if (!res.ok) {
      const err =
        (json as { message?: string })?.message ??
        (json as { error?: string })?.error ??
        text ??
        `${res.status} ${res.statusText}`;
      return { error: String(err) };
    }

    const captions = normalizeCaptions(json);
    return {
      data: {
        captions,
        raw: json,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Request failed: ${msg}` };
  }
}
