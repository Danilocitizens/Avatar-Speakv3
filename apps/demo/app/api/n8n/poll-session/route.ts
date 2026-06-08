import { consumeSession } from "../sessionStore";

/**
 * GET /api/n8n/poll-session?id=xxx
 *
 * Called by the frontend in modo_n8n to check if n8n has delivered
 * a session_token. Returns the token if available (and removes it
 * from the store), or a "pending" status if not yet ready.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idInteraccion = searchParams.get("id");

    if (!idInteraccion) {
      return new Response(
        JSON.stringify({ error: "Missing required query param: id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const session = consumeSession(idInteraccion);

    if (!session) {
      return new Response(
        JSON.stringify({
          status: "pending",
          message: "Session token not yet available. Keep polling.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.warn(
      "[n8n/poll-session] Delivering session token for:",
      idInteraccion,
    );

    return new Response(
      JSON.stringify({
        status: "ready",
        session_token: session.session_token,
        inicio_seg: session.inicio_seg || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[n8n/poll-session] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
