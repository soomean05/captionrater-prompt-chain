import { runCaptionGenerationForTest } from "@/lib/caption-generation";

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
      raw: result.data.raw,
      flavor: result.data.flavor,
      steps: result.data.steps,
      imageUrl: result.data.imageUrl,
      body,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
