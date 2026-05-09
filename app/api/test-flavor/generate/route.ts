import { createClient } from "@/lib/supabase/server";
import {
  ALMOSTCRACKD_REQUIRED_JSON_ENDING,
  applyAlmostCrackdFinalPromptStrictnessForRetry,
  backfillEmptySystemPromptsForFlavor,
  listStepsForFlavor,
  needsAlmostCrackdJsonReconcile,
  reconcileAlmostCrackdJsonPromptsForFlavor,
} from "@/lib/db/steps";
import { almostcrackdMessageLooksLikeInvalidJsonError } from "@/lib/api/almostcrackd-pipeline";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { runAssignment5TestFlavorCaptions } from "@/lib/test-flavor-captions";
import { getFlavor } from "@/lib/db/flavors";

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
      await listStepsForFlavor(humorFlavorId);

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

    const { data: stepsAfterBackfill } = await listStepsForFlavor(humorFlavorId);
    const sortedAfterBackfill = [...(stepsAfterBackfill ?? [])].sort((a, b) => {
      const ao = Number(a.order_by ?? 0);
      const bo = Number(b.order_by ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });

    if (sortedAfterBackfill.length && needsAlmostCrackdJsonReconcile(sortedAfterBackfill)) {
      const { error: recErr } =
        await reconcileAlmostCrackdJsonPromptsForFlavor(humorFlavorId, userId);
      if (recErr) {
        return Response.json(
          { error: recErr.message ?? "Could not align step prompts for AlmostCrackd." },
          { status: 500 }
        );
      }
    }

    const { data: flavorInfo } = await getFlavor(humorFlavorId);
    const { data: stepsForDebug } = await listStepsForFlavor(humorFlavorId);
    const sortedForDebug = [...(stepsForDebug ?? [])].sort((a, b) => {
      const ao = Number(a.order_by ?? 0);
      const bo = Number(b.order_by ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });
    const finalStepAfterReconcile =
      sortedForDebug.length > 0 ? sortedForDebug[sortedForDebug.length - 1]! : null;
    const finalPromptText = (finalStepAfterReconcile?.llm_user_prompt ?? "").trim();
    console.log(
      "[AlmostCrackd Debug] request context",
      JSON.stringify({
        selectedHumorFlavorId: humorFlavorId,
        selectedHumorFlavorName: flavorInfo?.name ?? null,
        orderedFlavorSteps: sortedForDebug.map((s, idx) => ({
          idx,
          id: s.id,
          order_by: s.order_by,
          systemPrompt: s.llm_system_prompt ?? "",
          userPrompt: s.llm_user_prompt ?? "",
        })),
        finalPromptText,
        jsonOnlyInstructionIsLast: finalPromptText.endsWith(
          ALMOSTCRACKD_REQUIRED_JSON_ENDING
        ),
        requiredEnding: ALMOSTCRACKD_REQUIRED_JSON_ENDING,
      })
    );

    const imageFilePayload =
      contentTypeHdr.includes("multipart/form-data") && multipartFile
        ? {
            buffer: Buffer.from(await multipartFile.arrayBuffer()),
            contentType: multipartFile.type?.trim()
              ? multipartFile.type
              : "application/octet-stream",
          }
        : null;

    async function runGenerateAttempt() {
      if (imageFilePayload) {
        return runAssignment5TestFlavorCaptions({
          accessToken,
          humorFlavorId,
          imageFile: imageFilePayload,
        });
      }
      return runAssignment5TestFlavorCaptions({
        accessToken,
        humorFlavorId,
        imageUrl,
      });
    }

    let result = await runGenerateAttempt();

    if (!result.ok) {
      // If AlmostCrackd rejects non-JSON output, force-reconcile final step prompts and retry once.
      if (almostcrackdMessageLooksLikeInvalidJsonError(result.error)) {
        for (let retryLevel = 1; retryLevel <= 3; retryLevel++) {
          const strict = await applyAlmostCrackdFinalPromptStrictnessForRetry(
            humorFlavorId,
            userId,
            retryLevel
          );
          if (strict.error) {
            return Response.json(
              {
                error:
                  strict.error.message ??
                  "Could not align step prompts for AlmostCrackd after JSON parse failure.",
              },
              { status: 500 }
            );
          }
          console.log(
            "[AlmostCrackd Debug] strict retry prompt",
            JSON.stringify({
              retryLevel,
              finalPromptText: strict.prompt ?? "",
              jsonOnlyInstructionIsLast: (strict.prompt ?? "").trim().endsWith(
                ALMOSTCRACKD_REQUIRED_JSON_ENDING
              ),
            })
          );
          await new Promise((r) => setTimeout(r, 200 * retryLevel));
          result = await runGenerateAttempt();
          if (
            result.ok ||
            !almostcrackdMessageLooksLikeInvalidJsonError(result.error)
          ) {
            break;
          }
        }
      }
    }

    if (!result.ok) {
      return Response.json(
        {
          error: result.error,
          rawAlmostCrackdResponse: result.rawAlmostCrackdResponse ?? null,
        },
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
