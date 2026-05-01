/**
 * Shared caption provider input/output shapes (AlmostCrackd, OpenAI, etc.).
 */

export type GenerateCaptionsInput = {
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
  /** Step user prompts combined for providers that consume a chain textually */
  steps?: string[];
  /**
   * Optional merged system prompts (humor-flavor chain). Used when
   * CAPTION_BACKEND=openai; ignored by AlmostCrackd.
   */
  compositeSystemPrompt?: string;
};

export type GenerateCaptionsResult = {
  captions: string[];
  raw?: unknown;
};

export function normalizeCaptions(raw: unknown): string[] {
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
