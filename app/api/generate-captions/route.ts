export async function POST(request: Request) {
  try {
    await request.json();

    return Response.json({
      ok: true,
      captions: [],
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
