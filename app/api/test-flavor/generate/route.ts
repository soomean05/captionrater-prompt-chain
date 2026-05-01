import { createClient } from "@/lib/supabase/server";
import { runAssignment5TestFlavorCaptions } from "@/lib/test-flavor-captions";

function captionBackendOk(): boolean {
  const v = process.env.CAPTION_BACKEND?.trim().toLowerCase();
  return !v || v === "almostcrackd";
}

/**
 * POST /api/test-flavor/generate
 * Body: { humorFlavorId, imageUrl }
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
    const body = (await request.json()) as Record<string, unknown>;
    const humorFlavorId = String(body.humorFlavorId ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();

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

    const result = await runAssignment5TestFlavorCaptions({
      accessToken: session.access_token,
      humorFlavorId,
      imageUrl,
    });

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
