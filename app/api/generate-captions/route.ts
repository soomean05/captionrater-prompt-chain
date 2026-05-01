import { runCaptionGenerationForTest } from "@/lib/caption-generation";

/**
 * POST /api/generate-captions
 * Body: { humorFlavorId, imageUrl } (also accepts flavor_id, image_url)
 *
 * 1. Read humorFlavorId and imageUrl from body
 * 2. Fetch humor flavor; fetch humor_flavor_steps ordered by order_by (in listStepsForFlavor)
 * 3. Build prompt from flavor name/description and each step’s llm_system_prompt, llm_user_prompt, description + imageUrl
 * 4. OpenAI returns exactly 5 short captions as JSON { captions: string[] }
 * 5. Requires OPENAI_API_KEY
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const humorFlavorId = String(
      body.humorFlavorId ?? body.flavor_id ?? ""
    ).trim();
    const imageUrl = String(body.imageUrl ?? body.image_url ?? "").trim();

    const result = await runCaptionGenerationForTest({
      humorFlavorId,
      imageUrl,
    });

    if (!result.ok) {
      return Response.json(
        { error: result.error },
        { status: result.status ?? 500 }
      );
    }

    return Response.json({
      ok: true,
      captions: result.data.captions,
      flavor: result.data.flavor,
      steps: result.data.steps,
      imageUrl: result.data.imageUrl,
      raw: result.data.raw,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
