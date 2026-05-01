/**
 * Caption API client — configured via ALMOSTCRACKD_* env vars.
 * Upstream Nitro servers return 405 bodies like "Method post is not allowed on this route"
 * when POST hits a route that doesn't exist or only allows GET — often a wrong base URL or path.
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

function mergeErrorBody(
  json: unknown,
  text: string,
  status: number,
  statusText: string
): string {
  if (!json || typeof json !== "object") {
    return text || `${status} ${statusText}`;
  }
  const o = json as Record<string, unknown>;
  return (
    (typeof o.message === "string" && o.message) ||
    (typeof o.statusMessage === "string" && o.statusMessage) ||
    (typeof o.error === "string" && o.error) ||
    text ||
    `${status} ${statusText}`
  );
}

/** Ordered POST URLs for the outbound caption provider. */
function computeCaptionPostUrls(): string[] {
  const endpointOverride = process.env.ALMOSTCRACKD_ENDPOINT?.trim();
  if (endpointOverride) {
    return [endpointOverride.replace(/\/$/, "")];
  }

  const rawBase = process.env.ALMOSTCRACKD_API_URL ?? BASE_URL;
  const pathFromEnvRaw = process.env.ALMOSTCRACKD_API_PATH ?? "/caption";
  const pathFromEnv = pathFromEnvRaw.startsWith("/")
    ? pathFromEnvRaw
    : `/${pathFromEnvRaw}`;

  let u: URL;
  try {
    u = new URL(rawBase.includes("://") ? rawBase : `https://${rawBase}`);
  } catch {
    u = new URL(BASE_URL);
  }

  if (u.hostname === "almostcrackd.ai" || u.hostname === "www.almostcrackd.ai") {
    u.hostname = "api.almostcrackd.ai";
  }

  const pathname = u.pathname.replace(/\/$/, "");
  const origin = `${u.protocol}//${u.host}`;
  const hasTrailingPath = pathname.length > 0;

  if (hasTrailingPath) {
    return [`${origin}${pathname}`];
  }

  const fallbacks = [
    pathFromEnv,
    "/api/caption",
    "/caption",
    "/api/generate-caption",
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of fallbacks) {
    const slug = p.startsWith("/") ? p : `/${p}`;
    const full = `${origin}${slug}`;
    if (!seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }
  return out;
}

export async function generateCaptions(
  input: GenerateCaptionsInput
): Promise<{ data?: GenerateCaptionsResult; error?: string }> {
  const apiKey = process.env.ALMOSTCRACKD_API_KEY;

  const body: Record<string, unknown> = {};
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.imageBase64) body.image_base64 = input.imageBase64;
  if (input.prompt) body.prompt = input.prompt;
  if (input.steps?.length) body.steps = input.steps;
  if (Object.keys(body).length === 0) {
    return { error: "Provide image_url or image_base64, and prompt or steps" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  const candidates = computeCaptionPostUrls();
  const tryNextOn = new Set([404, 405]);
  let lastMsg = "";
  let lastStatus = 0;

  try {
    for (const endpoint of candidates) {
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
        if (!res.ok) {
          lastMsg = text?.length
            ? `API error ${res.status}: ${text.slice(0, 280)}`
            : `${res.status} ${res.statusText}`;
          lastStatus = res.status;
          if (tryNextOn.has(res.status)) continue;
          return { error: `${lastMsg} (POST ${endpoint})` };
        }
        return { error: `Invalid JSON response (POST ${endpoint})` };
      }

      if (!res.ok) {
        const err = mergeErrorBody(json, text, res.status, res.statusText);
        lastMsg = String(err);
        lastStatus = res.status;
        if (tryNextOn.has(res.status)) continue;
        return { error: `${lastMsg} (POST ${endpoint})` };
      }

      const captions = normalizeCaptions(json);
      return {
        data: {
          captions,
          raw: json,
        },
      };
    }

    return {
      error: `${lastMsg || "Caption API rejected every URL tried."} Tried URLs: ${candidates.join(", ")}. Set ALMOSTCRACKD_ENDPOINT to the exact POST endpoint, or fix ALMOSTCRACKD_API_URL (use api.almostcrackd.ai, not almostcrackd.ai).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      error: `Request failed: ${msg}. Tried: ${candidates.join(", ")}`,
    };
  }
}
