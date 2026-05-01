export async function POST(request: Request) {
  try {
    const body = await request.json();

    return Response.json({
      ok: true,
      captions: ["test caption works"],
      body,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
