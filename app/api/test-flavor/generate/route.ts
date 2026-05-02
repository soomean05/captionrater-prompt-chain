import { createClient } from "@/lib/supabase/server";
import {
  backfillEmptySystemPromptsForFlavor,
  listStepsMinimalForFlavor,
} from "@/lib/db/steps";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { runAssignment5TestFlavorCaptions } from "@/lib/test-flavor-captions";

function captionBackendOk(): boolean {
  const v = process.env.CAPTION_BACKEND?.trim().toLowerCase();
  return !v || v === "almostcrackd";
}

/**
 * POST /api/test-flavor/generate
 *
 * JSON body: { humorFlavorId, imageUrl }
 * Or multipart/form-data: humorFlavorId, image (file)
 */
export async function POST(request: Request) {
  if (!captionBackendOk()) {
    return Response.json(
      {
        error:
          "CAPTION_BACKEND must be almostcrackd (or unset) for this endpoint.",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return Response.json(
        { error: "Not signed in. Sign in with Supabase to call AlmostCrackd." },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;
    const contentTypeHdr = request.headers.get("content-type") ?? "";

    let humorFlavorId: string;
    let multipartFile: File | null = null;
    let imageUrl = "";

    if (contentTypeHdr.includes("multipart/form-data")) {
      const form = await request.formData();
      humorFlavorId = String(form.get("humorFlavorId") ?? "").trim();
      const file = form.get("image");
      multipartFile = file instanceof File ? file : null;

      if (!humorFlavorId) {
        return Response.json({ error: "humorFlavorId is required." }, { status: 400 });
      }
      if (!multipartFile || multipartFile.size === 0) {
        return Response.json(
          { error: "Multipart request must include a non-empty image file." },
          { status: 400 }
        );
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      humorFlavorId = String(body.humorFlavorId ?? "").trim();
      imageUrl = String(body.imageUrl ?? "").trim();

      if (!humorFlavorId) {
        return Response.json({ error: "humorFlavorId is required." }, { status: 400 });
      }
    }

    const { data: steps, error: stepsError } =
      await listStepsMinimalForFlavor(humorFlavorId);

    if (stepsError) {
      throw stepsError;
    }

    if (!steps || steps.length === 0) {
      return Response.json(
        {
          error:
            "This humor flavor has no steps yet. Add at least one step before testing captions.",
        },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId(supabase);
    const { error: backfillError } =
      await backfillEmptySystemPromptsForFlavor(humorFlavorId, userId);
    if (backfillError) {
      return Response.json(
        {
          error:
            backfillError.message ??
            "Could not ensure system prompts on flavor steps.",
        },
        { status: 500 }
      );
    }

    let result;

    if (contentTypeHdr.includes("multipart/form-data") && multipartFile) {
      const buffer = Buffer.from(await multipartFile.arrayBuffer());
      result = await runAssignment5TestFlavorCaptions({
        accessToken,
        humorFlavorId,
        imageFile: {
          buffer,
          contentType: multipartFile.type?.trim()
            ? multipartFile.type
            : "application/octet-stream",
        },
      });
    } else {
      result = await runAssignment5TestFlavorCaptions({
        accessToken,
        humorFlavorId,
        imageUrl,
      });
    }

    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return Response.json({
      ok: true,
      captions: result.captions,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
