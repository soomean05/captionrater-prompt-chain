import { getFlavor } from "@/lib/db/flavors";
import {
  ALMOSTCRACKD_REQUIRED_JSON_ENDING,
  listStepsForFlavor,
  type HumorFlavorStep,
} from "@/lib/db/steps";
import {
  almostcrackdMessageLooksLikeInvalidJsonError,
  extractCaptions,
  generatePresignedUrl,
  imageIdFromRegisterResponse,
  putBytesToPresignedUrl,
  requestGenerateCaptions,
  uploadImageFromUrl,
  pickPresignedUrls,
  type PipelinePostFailure,
  type PipelinePostSuccess,
} from "@/lib/api/almostcrackd-pipeline";

/** Test lab targets this many distinct caption lines. */
export const TEST_FLAVOR_TARGET_CAPTION_COUNT = 5;

/** N parallel calls; body is only `{ imageId, humorFlavorId }` each. */
function parallelGenerateCaptionsEnabled(): boolean {
  return process.env.ALMOSTCRACKD_PARALLEL_GENERATE?.trim() === "1";
}

/** Merge caption runs; exact match after trim (case-sensitive) so near-dupes from the model stay distinct. */
function dedupeExactLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function failureMessage(f: PipelinePostFailure): string {
  return f.message;
}

function orderedSteps(steps: HumorFlavorStep[]): HumorFlavorStep[] {
  return [...steps].sort((a, b) => {
    const ao = Number(a.order_by ?? 0);
    const bo = Number(b.order_by ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a.id).localeCompare(String(b.id));
  });
}

function lastStepLooksJsonOnly(steps: HumorFlavorStep[]): boolean {
  if (!steps.length) return false;
  const last = orderedSteps(steps)[steps.length - 1]!;
  const finalPrompt = (last.llm_user_prompt ?? "").trim();
  return finalPrompt.endsWith(ALMOSTCRACKD_REQUIRED_JSON_ENDING);
}

function augmentAlmostCrackdJsonParseError(message: string): string {
  if (!almostcrackdMessageLooksLikeInvalidJsonError(message)) return message;
  return "AlmostCrackd returned non-JSON text for caption generation multiple times. This can be transient; please retry once.";
}

function isInvalidJson500(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("almostcrackd error 500") &&
    (m.includes("is not valid json") || m.includes("unexpected token"))
  );
}

/** AlmostCrackd sometimes 400s on generate-captions if their CDN is not ready yet. */
async function waitAfterImageRegister(): Promise<void> {
  const raw = process.env.ALMOSTCRACKD_POST_UPLOAD_DELAY_MS ?? "400";
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms <= 0) return;
  const clamped = Math.min(20_000, ms);
  await new Promise((r) => setTimeout(r, clamped));
}

/** Optional pause between sequential generate calls (default 0ms). */
async function gapBetweenSequentialGenerates(): Promise<void> {
  const raw = process.env.ALMOSTCRACKD_SEQUENTIAL_GAP_MS ?? "0";
  const ms = Number.parseInt(raw, 10);
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise((r) => setTimeout(r, Math.min(10_000, ms)));
}

/**
 * Assignment 5: register image (presigned flow or direct imageUrl),
 * then generate-captions with ONLY `{ imageId, humorFlavorId }` (number when id is all digits).
 */
export async function runAssignment5TestFlavorCaptions(input: {
  accessToken: string;
  humorFlavorId: string;
  /** Public URL — POST /pipeline/upload-image-from-url */
  imageUrl?: string;
  /** Optional file — presigned → PUT → register with returned cdnUrl */
  imageFile?: { buffer: Buffer; contentType: string };
}): Promise<
  | { ok: true; captions: string[] }
  | { ok: false; error: string; status: number; rawAlmostCrackdResponse?: string }
> {
  const humorFlavorId = input.humorFlavorId.trim();
  if (!humorFlavorId) {
    return { ok: false, error: "humorFlavorId is required", status: 400 };
  }

  const hasFile = Boolean(input.imageFile?.buffer?.length);
  const imageUrl = input.imageUrl?.trim() ?? "";
  if (!hasFile && !imageUrl) {
    return { ok: false, error: "imageUrl or image file is required", status: 400 };
  }

  const { data: flavor, error: flavorError } = await getFlavor(humorFlavorId);
  if (flavorError || !flavor) {
    return { ok: false, error: "Flavor not found", status: 404 };
  }

  const { data: stepRows } = await listStepsForFlavor(humorFlavorId);
  const ordered = orderedSteps(stepRows ?? []);
  const finalStep = ordered.length ? ordered[ordered.length - 1]! : null;
  console.log(
    "[AlmostCrackd Debug] pre-generate context",
    JSON.stringify({
      humorFlavorId: flavor.id,
      humorFlavorName: flavor.name ?? null,
      orderedFlavorSteps: ordered.map((s, idx) => ({
        idx,
        id: s.id,
        order_by: s.order_by,
        systemPrompt: s.llm_system_prompt ?? "",
        userPrompt: s.llm_user_prompt ?? "",
      })),
      finalPromptText: finalStep?.llm_user_prompt ?? "",
      jsonOnlyInstructionIsLast: lastStepLooksJsonOnly(ordered),
      requiredEnding: ALMOSTCRACKD_REQUIRED_JSON_ENDING,
    })
  );

  let registerImageUrlForPipeline: string;

  if (hasFile && input.imageFile) {
    const ctype = input.imageFile.contentType || "application/octet-stream";
    const presign = await generatePresignedUrl(ctype, input.accessToken);
    if (!presign.ok) {
      return { ok: false, error: failureMessage(presign), status: 502 };
    }

    const d = presign.data as Record<string, unknown>;
    const { presignedUrl, cdnUrl } = pickPresignedUrls(d);
    if (!presignedUrl?.trim()) {
      return {
        ok: false,
        error:
          "generate-presigned-url did not return presignedUrl (check AlmostCrackd response shape)",
        status: 502,
      };
    }
    if (!cdnUrl?.trim()) {
      return {
        ok: false,
        error:
          "generate-presigned-url did not return cdnUrl (check AlmostCrackd response shape)",
        status: 502,
      };
    }

    const put = await putBytesToPresignedUrl(
      presignedUrl,
      input.imageFile.buffer,
      ctype
    );
    if (!put.ok) {
      return { ok: false, error: put.message, status: 502 };
    }

    registerImageUrlForPipeline = cdnUrl.trim();
  } else {
    registerImageUrlForPipeline = imageUrl;
  }

  const register = await uploadImageFromUrl(
    registerImageUrlForPipeline,
    input.accessToken,
    false
  );
  if (!register.ok) {
    return {
      ok: false,
      error: failureMessage(register),
      status: 502,
    };
  }

  const imageId = imageIdFromRegisterResponse(register.data);
  if (!imageId) {
    return {
      ok: false,
      error: "imageId not returned from /pipeline/upload-image-from-url",
      status: 502,
    };
  }

  await waitAfterImageRegister();

  const requested = TEST_FLAVOR_TARGET_CAPTION_COUNT;

  let results: Array<PipelinePostSuccess<unknown> | PipelinePostFailure>;

  if (parallelGenerateCaptionsEnabled()) {
    const settled = await Promise.allSettled(
      Array.from({ length: requested }, () =>
        requestGenerateCaptions(input.accessToken, {
          imageId,
          humorFlavorId: flavor.id,
        })
      )
    );
    results = settled.map((s) => {
      if (s.status === "fulfilled") return s.value;
      const msg =
        s.reason instanceof Error ? s.reason.message : "Request failed";
      return {
        ok: false as const,
        status: 502,
        endpoint: "",
        message: msg,
      };
    });
  } else {
    results = [];
    const slotExtraParsed = Number.parseInt(
      process.env.ALMOSTCRACKD_SLOT_EXTRA_RETRIES ?? "0",
      10
    );
    const slotExtraMax = Number.isFinite(slotExtraParsed)
      ? Math.min(6, Math.max(0, slotExtraParsed))
      : 0;

    for (let i = 0; i < requested; i++) {
      if (i > 0) await gapBetweenSequentialGenerates();

      let r = await requestGenerateCaptions(input.accessToken, {
        imageId,
        humorFlavorId: flavor.id,
      });
      let extra = 0;
      while (
        !r.ok &&
        extra < slotExtraMax &&
        almostcrackdMessageLooksLikeInvalidJsonError(failureMessage(r)) &&
        !isInvalidJson500(failureMessage(r))
      ) {
        extra++;
        await new Promise((res) => setTimeout(res, Math.min(3_000, 300 * extra)));
        r = await requestGenerateCaptions(input.accessToken, {
          imageId,
          humorFlavorId: flavor.id,
        });
      }

      results.push(r);
      if (!r.ok) {
        if (isInvalidJson500(failureMessage(r))) {
          return {
            ok: false,
            error: augmentAlmostCrackdJsonParseError(failureMessage(r)),
            status: 502,
            rawAlmostCrackdResponse: r.rawBody,
          };
        }
        const mergedSoFar = dedupeExactLines(
          results.flatMap((x) => (x.ok ? extractCaptions(x.data) : []))
        );
        if (mergedSoFar.length > 0) break;
        // Keep probing additional slots: AlmostCrackd can fail one call and
        // still return valid JSON on subsequent calls for the same payload.
        continue;
      }
    }
  }

  const merged = dedupeExactLines(
    results.flatMap((r) => (r.ok ? extractCaptions(r.data) : []))
  ).slice(0, requested);

  if (merged.length === 0) {
    const firstFail = results.find((r) => !r.ok);
    if (firstFail && !firstFail.ok) {
      return {
        ok: false,
        error: augmentAlmostCrackdJsonParseError(failureMessage(firstFail)),
        status: 502,
        rawAlmostCrackdResponse: firstFail.rawBody,
      };
    }
    throw new Error(
      `AlmostCrackd returned 0 captions. Raw first response: ${JSON.stringify(results[0]?.ok ? results[0].data : results[0])}`
    );
  }

  return { ok: true, captions: merged };
}
