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
  /** Optional — forwarded as `count` when greater than 1 on generate-captions */
  captionCount?: number;
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

  const gen = await requestGenerateCaptions(input.accessToken, {
    imageId,
    humorFlavorId: flavor.id,
    captionCount: input.captionCount,
  });

  if (!gen.ok) {
    return {
      ok: false,
      error: failureMessage(gen),
      status: 502,
    };
  }

  const captionsJson = gen.data;
  const captions = extractCaptions(captionsJson);

  if (captions.length === 0) {
    throw new Error(
      `AlmostCrackd returned 0 captions. Raw response: ${JSON.stringify(captionsJson)}`
    );
  }

  return { ok: true, captions };
}
