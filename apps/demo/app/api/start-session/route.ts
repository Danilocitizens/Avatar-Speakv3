import { API_KEY, API_URL, LANGUAGE } from "../secrets";

export async function POST(request: Request) {
  let session_token = "";
  let session_id = "";
  try {
    const body = await request.json().catch(() => ({}));
    const { knowledge_id, avatar_id, voice_id } = body;
    console.warn("Start Session Params:", {
      knowledge_id,
      avatar_id,
      voice_id,
    });

    if (!knowledge_id || !avatar_id || !voice_id) {
      throw new Error(
        "Missing required params (knowledge_id, avatar_id, voice_id). Webhook must provide them.",
      );
    }

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatar_id,
        avatar_persona: {
          voice_id: voice_id,
          context_id: knowledge_id,
          language: LANGUAGE,
        },
      }),
    });

    if (!res.ok) {
      let errorMessage = "Failed to retrieve session token";
      try {
        const resp = await res.json();
        console.error("HeyGen API Error:", JSON.stringify(resp));
        errorMessage = resp.data?.[0]?.message || resp.message || errorMessage;
      } catch (e) {
        const text = await res.text();
        console.error("HeyGen API Error (Text):", text);
        errorMessage = text || errorMessage;
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = await res.json();

    session_token = data.data.session_token;
    session_id = data.data.session_id;
  } catch (error) {
    console.error("Error retrieving session token:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!session_token) {
    return new Response(
      JSON.stringify({ error: "Failed to retrieve session token" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  return new Response(JSON.stringify({ session_token, session_id }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
