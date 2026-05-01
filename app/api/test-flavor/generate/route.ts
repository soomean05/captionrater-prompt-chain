import { createClient } from "@/lib/supabase/server";
import { runAssignment5TestFlavorCaptions } from "@/lib/test-flavor-captions";

function captionBackendOk(): boolean {
  const v = process.env.CAPTION_BACKEND?.trim().toLowerCase();
  return !v || v === "almostcrackd";
}

/**
 * POST /api/test-flavor/generate
 *
 * JSON body: { humorFlavorId, imageUrl }
 * Or multipart/form-data: humorFlavorId, image (file) — Assignment 5 presigned PUT flow
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

    let result;

    if (contentTypeHdr.includes("multipart/form-data")) {
      const form = await request.formData();
      const humorFlavorId = String(form.get("humorFlavorId") ?? "").trim();
      const file = form.get("image");

      if (!(file instanceof File) || file.size === 0) {
        return Response.json(
          { error: "Multipart request must include a non-empty image file." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      result = await runAssignment5TestFlavorCaptions({
        accessToken,
        humorFlavorId,
        imageFile: {
          buffer,
          contentType: file.type?.trim()
            ? file.type
            : "application/octet-stream",
        },
      });
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      const humorFlavorId = String(body.humorFlavorId ?? "").trim();
      const imageUrl = String(body.imageUrl ?? "").trim();

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
