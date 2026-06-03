import { API_KEY, API_URL } from "../secrets";

export async function POST(request: Request) {
  let session_token = "";
  let session_id = "";
  try {
    const body = await request.json().catch(() => ({}));
    const { avatar_id, agent_id, secret_id } = body;

    console.warn("[start-session] Webhook params:", {
      avatar_id,
      agent_id,
      secret_id,
    });

    if (!avatar_id || !agent_id || !secret_id) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required params (avatar_id, agent_id, secret_id). Webhook must provide them.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const payload = {
      mode: "LITE",
      avatar_id: avatar_id,
      elevenlabs_agent_config: {
        secret_id: secret_id,
        agent_id: agent_id,
      },
    };

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
      let heygenCode: number | undefined;
      try {
        const resp = JSON.parse(rawTokenBody);
        errorMessage = resp.data?.[0]?.message || resp.message || errorMessage;
        heygenCode = resp.code;
      } catch {
        errorMessage = rawTokenBody || errorMessage;
      }
      return new Response(
        JSON.stringify({
          error: errorMessage,
          heygen_code: heygenCode,
          heygen_request_id: tokenHeaderSnapshot["x-request-id"],
        }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        },
      );
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
