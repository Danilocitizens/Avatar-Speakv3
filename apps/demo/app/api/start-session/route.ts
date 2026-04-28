import {
  API_KEY,
  API_URL,
  ELEVENLABS_MODEL_ID,
  ELEVENLABS_SPEED,
  ELEVENLABS_STABILITY,
  ELEVENLABS_SIMILARITY_BOOST,
  ELEVENLABS_STYLE,
  ELEVENLABS_USE_SPEAKER_BOOST,
} from "../secrets";

export async function POST(request: Request) {
  let session_token = "";
  let session_id = "";
  try {
    const body = await request.json().catch(() => ({}));
    const { knowledge_id, avatar_id, voice_id, language, proveedor } = body;
    const provider = (proveedor || "heygen").toString().toLowerCase();

    console.warn("Start Session Params:", {
      knowledge_id,
      avatar_id,
      voice_id,
      language,
      provider,
    });

    if (!knowledge_id || !avatar_id || !voice_id) {
      throw new Error(
        "Missing required params (knowledge_id, avatar_id, voice_id). Webhook must provide them.",
      );
    }

    const baseAvatarPersona = {
      voice_id: voice_id,
      context_id: knowledge_id,
      language: language,
    };

    const payload =
      provider === "elevenlabs"
        ? {
            mode: "FULL",
            avatar_id: avatar_id,
            avatar_persona: {
              ...baseAvatarPersona,
              stt_config: { provider: "deepgram" },
              voice_settings: {
                provider: "elevenLabs",
                speed: ELEVENLABS_SPEED,
                stability: ELEVENLABS_STABILITY,
                similarity_boost: ELEVENLABS_SIMILARITY_BOOST,
                style: ELEVENLABS_STYLE,
                use_speaker_boost: ELEVENLABS_USE_SPEAKER_BOOST,
                model: ELEVENLABS_MODEL_ID,
              },
            },
            interactivity_type: "CONVERSATIONAL",
          }
        : {
            mode: "FULL",
            avatar_id: avatar_id,
            avatar_persona: baseAvatarPersona,
          };

    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
