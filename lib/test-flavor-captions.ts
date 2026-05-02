import { getFlavor } from "@/lib/db/flavors";
import {
  extractCaptions,
  generatePresignedUrl,
  imageIdFromRegisterResponse,
  putBytesToPresignedUrl,
  requestGenerateCaptions,
  uploadImageFromUrl,
  pickPresignedUrls,
  type PipelinePostFailure,
} from "@/lib/api/almostcrackd-pipeline";

/** Test lab targets this many distinct caption lines. */
export const TEST_FLAVOR_TARGET_CAPTION_COUNT = 5;

/** When `"1"`, run N parallel generate calls (no per-call `count`) for diversity. Default is one call with `count: N` — much easier on AlmostCrackd and avoids their JSON-parse 500s under load. */
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

/**
 * Assignment 5: register image (presigned flow or direct imageUrl),
 * then generate-captions with ONLY { imageId, humorFlavorId } (digits → number else UUID string).
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
  | { ok: false; error: string; status: number }
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

  const requested = TEST_FLAVOR_TARGET_CAPTION_COUNT;

  const settled = parallelGenerateCaptionsEnabled()
    ? await Promise.allSettled(
        Array.from({ length: requested }, () =>
          requestGenerateCaptions(input.accessToken, {
            imageId,
            humorFlavorId: flavor.id,
          })
        )
      )
    : await Promise.allSettled([
        requestGenerateCaptions(input.accessToken, {
          imageId,
          humorFlavorId: flavor.id,
          desiredCaptionCount: requested,
        }),
      ]);

  const results = settled.map((s) => {
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

  const merged = dedupeExactLines(
    results.flatMap((r) => (r.ok ? extractCaptions(r.data) : []))
  ).slice(0, requested);

  if (merged.length === 0) {
    const firstFail = results.find((r) => !r.ok);
    if (firstFail && !firstFail.ok) {
      return {
        ok: false,
        error: failureMessage(firstFail),
        status: 502,
      };
    }
    throw new Error(
      `AlmostCrackd returned 0 captions from parallel batch. Raw first response: ${JSON.stringify(results[0]?.ok ? results[0].data : results[0])}`
    );
  }

  return { ok: true, captions: merged };
}
