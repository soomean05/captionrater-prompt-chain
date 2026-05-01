import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import { generateCaptions } from "@/lib/api/almostcrackd";

function stepTextFromRow(step: Record<string, unknown>): string {
  return (
    (step.llm_user_prompt as string) ??
    (step.description as string) ??
    ""
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const humorFlavorId = String(
      body.humorFlavorId ?? body.flavor_id ?? ""
    ).trim();
    const imageUrl = String(body.imageUrl ?? body.image_url ?? "").trim();

    if (!humorFlavorId) {
      return Response.json({ error: "humorFlavorId is required" }, { status: 400 });
    }
    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const { data: flavor, error: flavorError } = await getFlavor(humorFlavorId);
    if (flavorError || !flavor) {
      return Response.json({ error: "Flavor not found" }, { status: 404 });
    }

    const { data: steps, error: stepsError } = await listStepsForFlavor(
      humorFlavorId
    );
    if (stepsError) {
      return Response.json({ error: stepsError.message }, { status: 500 });
    }

    const stepContents = (steps ?? []).map((s) =>
      stepTextFromRow(s as Record<string, unknown>)
    );
    const prompt = stepContents.filter(Boolean).join("\n\n");

    const { data, error } = await generateCaptions({
      imageUrl,
      prompt: prompt || undefined,
      steps: stepContents.some(Boolean) ? stepContents : undefined,
    });

    if (error) {
      return Response.json({ error }, { status: 502 });
    }

    return Response.json({
      ok: true,
      captions: data?.captions ?? [],
      raw: data?.raw,
      flavor,
      steps: steps ?? [],
      imageUrl,
      body,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
