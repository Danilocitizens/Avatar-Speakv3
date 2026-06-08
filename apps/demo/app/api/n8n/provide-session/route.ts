import { setSession } from "../sessionStore";

/**
 * POST /api/n8n/provide-session
 *
 * Called by n8n (HTTP Request node) after it creates a HeyGen session.
 * Stores the session_token so the frontend can pick it up via polling.
 *
 * Expected body:
 * {
 *   "session_token": "...",
 *   "id_interaccion": "...",
 *   "inicio_seg": "300"  // optional
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { session_token, id_interaccion, inicio_seg } = body;

    if (!session_token || !id_interaccion) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: session_token and id_interaccion are required.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.warn("[n8n/provide-session] Storing session for:", id_interaccion);

    setSession(id_interaccion, {
      session_token,
      inicio_seg: inicio_seg || undefined,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Session token stored for interaction ${id_interaccion}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[n8n/provide-session] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
