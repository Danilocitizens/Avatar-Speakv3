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
    // `prov` es un campo INTERNO de nuestro flujo (viene del webhook n8n).
    // Valores: "elabs" | "heygen". Solo decide qué payload construimos
    // localmente. NO se envía nunca a LiveAvatar — el provider real ya
    // está bindeado en el recurso voice_id.
    const { knowledge_id, avatar_id, voice_id, language, prov } = body;
    const provInternal = (prov || "heygen").toString().toLowerCase();

    console.warn("[start-session] Webhook params (internal):", {
      knowledge_id,
      avatar_id,
      voice_id,
      language,
      prov_internal: provInternal,
    });

    if (!knowledge_id || !avatar_id || !voice_id) {
      throw new Error(
        "Missing required params (knowledge_id, avatar_id, voice_id). Webhook must provide them.",
      );
    }

    // El `prov` que viene de n8n diferencia el camino:
    //   - "heygen": voice nativo de HeyGen → payload mínimo, sin stt_config externo
    //   - "elabs": voice_id importado vía /v1/voices/third_party → el
    //     binding (provider + secret + provider_voice_id) ya vive en el recurso,
    //     por eso NO se debe mandar voice_settings encima (rompe la pipeline:
    //     "Errors validating session token" / 400 silencioso).
    const baseAvatarPersona = {
      voice_id: voice_id,
      context_id: knowledge_id,
      language: language,
    };

    const payload =
      provInternal === "elabs"
        ? {
            mode: "FULL",
            avatar_id: avatar_id,
            avatar_persona: {
              ...baseAvatarPersona,
              stt_config: { provider: "deepgram" },
            },
            interactivity_type: "CONVERSATIONAL",
          }
        : {
            mode: "FULL",
            avatar_id: avatar_id,
            avatar_persona: baseAvatarPersona,
          };

    // Estas envs ya no se envían (el binding del voice_id third-party las
    // hace innecesarias). Se mantienen importadas por si en el futuro se
    // expone otro modo que sí las requiera.
    void ELEVENLABS_MODEL_ID;
    void ELEVENLABS_SPEED;
    void ELEVENLABS_STABILITY;
    void ELEVENLABS_SIMILARITY_BOOST;
    void ELEVENLABS_STYLE;
    void ELEVENLABS_USE_SPEAKER_BOOST;

    console.warn("[start-session] POSTing to /v1/sessions/token", {
      url: `${API_URL}/v1/sessions/token`,
      payload,
    });
    const res = await fetch(`${API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const tokenHeaderSnapshot = {
      "content-type": res.headers.get("content-type"),
      "x-request-id": res.headers.get("x-request-id"),
      "x-trace-id": res.headers.get("x-trace-id"),
    };
    const rawTokenBody = await res.text();

    if (!res.ok) {
      console.error("[start-session] /v1/sessions/token Error:", {
        status: res.status,
        statusText: res.statusText,
        headers: tokenHeaderSnapshot,
        rawBody: rawTokenBody,
      });
      let errorMessage = "Failed to retrieve session token";
      try {
        const resp = JSON.parse(rawTokenBody);
        errorMessage = resp.data?.[0]?.message || resp.message || errorMessage;
      } catch {
        errorMessage = rawTokenBody || errorMessage;
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    let data: any;
    try {
      data = JSON.parse(rawTokenBody);
    } catch (e) {
      console.error("[start-session] Failed to parse 2xx body from /token:", {
        headers: tokenHeaderSnapshot,
        rawBody: rawTokenBody,
        parseError: (e as Error).message,
      });
      return new Response(
        JSON.stringify({
          error: "Upstream returned non-JSON 2xx response",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    console.warn("[start-session] /v1/sessions/token OK:", {
      headers: tokenHeaderSnapshot,
      code: data?.code,
      dataKeys: data?.data ? Object.keys(data.data) : null,
      dataPreview: data?.data,
    });

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
