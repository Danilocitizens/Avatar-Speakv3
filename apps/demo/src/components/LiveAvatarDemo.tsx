"use client";

import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { LiveAvatarSession } from "./LiveAvatarSession";
import { translations, Language } from "../constants/translations";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import { reportErrorToWebhook, buildErrorReport } from "../utils/errorReporter";

const LiveAvatarDemoContent = () => {
  const [sessionToken, setSessionToken] = useState("");
  const [mode, setMode] = useState<"FULL" | "CUSTOM">("FULL");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showNoExerciseScreen, setShowNoExerciseScreen] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const idInteraction = searchParams.get("id");
  const [currentLanguage, setCurrentLanguage] = useState<Language>("es");
  const [isWebhookReady, setIsWebhookReady] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const MAX_RECONNECT_CYCLES = 2;
  const reconnectCycleCountRef = useRef(0);
  const lastSessionStartTimeRef = useRef<number>(0);
  const t = translations[currentLanguage];

  // modo_n8n: when "activo", session is created externally by n8n
  const [isModoN8n, setIsModoN8n] = useState(false);
  const [isWaitingN8nSession, setIsWaitingN8nSession] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const POLL_INTERVAL_MS = 2000;
  const POLL_TIMEOUT_MS = 120000; // 2 minutes max wait
  const pollStartTimeRef = useRef<number>(0);

  // Store last session params for reconnection
  const lastSessionParamsRef = useRef<{
    avatar_id: string;
    agent_id: string;
    secret_id: string;
  } | null>(null);

  // Automatic webhook trigger on page load (Requested feature)
  useEffect(() => {
    // Define the async function inside the effect
    const triggerOnLoad = async () => {
      try {
        const response = await fetchWithTimeout(
          "https://devwebhook.inteliventa.ai/webhook/liveavatar",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_interaccion: idInteraction || "" }),
          },
          10000,
        );

        const webhookData = await response.json();
        // console.log("Automatic entrance webhook fired for:", idInteraction);

        // Handle Language from Webhook
        if (webhookData.idioma) {
          const lang = webhookData.idioma.toLowerCase();
          if (lang.includes("portugués") || lang.includes("portugal")) {
            setCurrentLanguage("pt");
          } else if (lang.includes("francés") || lang.includes("frances")) {
            setCurrentLanguage("fr");
          } else if (lang.includes("alemán") || lang.includes("aleman")) {
            setCurrentLanguage("de");
          } else if (
            lang.includes("inglés") ||
            lang.includes("ingles") ||
            lang === "en" ||
            lang.includes("americano")
          ) {
            setCurrentLanguage("en");
          } else if (lang.includes("italiano")) {
            setCurrentLanguage("it");
          } else if (lang.includes("polaco")) {
            setCurrentLanguage("pl");
          } else if (lang.includes("noruego")) {
            setCurrentLanguage("no");
          } else if (lang.includes("holandés") || lang.includes("holandes")) {
            setCurrentLanguage("nl");
          } else {
            setCurrentLanguage("es"); // Default
          }
        }
      } catch (err) {
        console.error("Failed to fire automatic entrance webhook:", err);
        reportErrorToWebhook(
          buildErrorReport(
            "WEBHOOK_TIMEOUT",
            err instanceof Error ? err.message : "Page load webhook failed",
            "webhook",
            idInteraction || "",
            { context: "Automatic page load webhook" },
          ),
        );
      } finally {
        setIsWebhookReady(true);
      }
    };

    triggerOnLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to create a session from stored params (used by both handleStart and reconnection)
  const createSessionFromParams = useCallback(
    async (params: {
      avatar_id: string;
      agent_id: string;
      secret_id: string;
    }): Promise<string> => {
      const res = await fetchWithTimeout(
        "/api/start-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        },
        15000,
      );
      if (!res.ok) {
        const errorData = await res.json();
        const err = new Error(
          errorData.error || "Failed to retrieve session token",
        );
        (err as any).httpStatus = res.status;
        (err as any).heygenCode = errorData.heygen_code;
        (err as any).heygenRequestId = errorData.heygen_request_id;
        throw err;
      }
      const { session_token } = await res.json();
      return session_token;
    },
    [],
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Start polling for n8n session token
  const startPollingForN8nSession = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    setIsWaitingN8nSession(true);
    pollStartTimeRef.current = Date.now();
    console.warn("[modo_n8n] Starting to poll for session token...");

    pollingIntervalRef.current = setInterval(async () => {
      // Check timeout
      if (Date.now() - pollStartTimeRef.current > POLL_TIMEOUT_MS) {
        console.warn("[modo_n8n] Polling timeout reached.");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsWaitingN8nSession(false);
        setIsStarting(false);
        setError("Tiempo de espera agotado. n8n no envió la sesión.");
        reportErrorToWebhook(
          buildErrorReport(
            "N8N_SESSION_TIMEOUT",
            "Polling timeout: n8n did not provide session token",
            "session",
            idInteraction || "",
            { context: "modo_n8n polling timeout" },
          ),
        );
        return;
      }

      try {
        const res = await fetchWithTimeout(
          `/api/n8n/poll-session?id=${encodeURIComponent(idInteraction || "")}`,
          { method: "GET" },
          5000,
        );
        const data = await res.json();

        if (data.status === "ready" && data.session_token) {
          console.warn("[modo_n8n] Session token received from n8n!");

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsWaitingN8nSession(false);

          // Parse inicio_seg from n8n if provided
          if (data.inicio_seg) {
            const parsed = parseInt(data.inicio_seg, 10);
            if (!isNaN(parsed)) {
              setTimerSeconds(parsed);
            }
          }

          lastSessionStartTimeRef.current = Date.now();
          setSessionToken(data.session_token);
          setMode("FULL");
        }
        // If status is "pending", just keep polling
      } catch (err) {
        console.error("[modo_n8n] Polling error:", err);
        // Don't stop polling on transient errors, just log
      }
    }, POLL_INTERVAL_MS);
  }, [idInteraction]);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    reconnectCycleCountRef.current = 0;
    try {
      // Webhook Validation
      const webhookResponse = await fetchWithTimeout(
        "https://devwebhook.inteliventa.ai/webhook/liveavatar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_interaccion: idInteraction || "" }),
        },
        10000,
      );
      const webhookData = await webhookResponse.json();
      console.warn("Start Session Webhook Data:", webhookData);

      // Parse inicio_seg
      if (
        webhookData.inicio_seg &&
        webhookData.inicio_seg !== "no disponible"
      ) {
        console.warn("webhookData.inicio_seg found:", webhookData.inicio_seg);
        const parsed = parseInt(webhookData.inicio_seg, 10);
        if (!isNaN(parsed)) {
          console.warn("Parsed timerSeconds:", parsed);
          setTimerSeconds(parsed);
        } else {
          console.warn("Failed to parse timerSeconds, setting null");
          setTimerSeconds(null);
        }
      } else {
        console.warn("inicio_seg not found or no disponible");
        setTimerSeconds(null);
      }

      if (webhookData.respuesta === "apagado") {
        setShowNoExerciseScreen(true);
        setIsStarting(false);
        return;
      }

      if (!webhookData.agent_id) {
        console.warn(
          "No agent_id provided by webhook. Showing No Exercise screen.",
        );
        setShowNoExerciseScreen(true);
        setIsStarting(false);
        return;
      }

      // ============================================
      // modo_n8n: Skip session creation, wait for n8n
      // ============================================
      const modoN8n = webhookData.modo_n8n;
      if (modoN8n && modoN8n.toLowerCase().trim() === "activo") {
        console.warn(
          "[modo_n8n] Detected modo_n8n=activo. Skipping session creation.",
        );
        setIsModoN8n(true);
        // Do NOT create session — n8n will do it and send us the token
        startPollingForN8nSession();
        return;
      }
      // ============================================

      const sessionParams = {
        avatar_id: webhookData.avatar_id,
        agent_id: webhookData.agent_id,
        secret_id: webhookData.secret_id,
      };

      // Store params for reconnection
      lastSessionParamsRef.current = sessionParams;

      const session_token = await createSessionFromParams(sessionParams);

      // Parse inicio_seg BEFORE setting session token
      let parsedTimer: number | null = null;
      if (
        webhookData.inicio_seg &&
        webhookData.inicio_seg !== "no disponible"
      ) {
        const parsed = parseInt(webhookData.inicio_seg, 10);
        if (!isNaN(parsed)) {
          parsedTimer = parsed;
        }
      }

      setTimerSeconds(parsedTimer);
      lastSessionStartTimeRef.current = Date.now();
      setSessionToken(session_token);
      setMode("FULL");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("handleStart error:", error);
      setError(error.message || t.genericError);
      setIsStarting(false);

      const httpStatus = error.httpStatus ?? error.status ?? null;
      let errorContext = "handleStart";
      if (httpStatus) errorContext += ` | HTTP ${httpStatus}`;
      if (error.heygenCode) errorContext += ` | Code: ${error.heygenCode}`;
      if (error.heygenRequestId)
        errorContext += ` | ReqID: ${error.heygenRequestId}`;

      reportErrorToWebhook(
        buildErrorReport(
          "SESSION_START_FAILED",
          error.message || "Unknown error during session start",
          "session",
          idInteraction || "",
          {
            httpStatus,
            context: errorContext,
          },
        ),
      );
    }
  };

  // Reconnection handler - called when session disconnects unexpectedly
  const handleDisconnected = useCallback(async () => {
    // In modo_n8n, do NOT auto-reconnect (n8n manages sessions)
    if (isModoN8n) {
      console.warn(
        "[modo_n8n] Session disconnected. Reconnection disabled in modo_n8n.",
      );
      setIsStarting(false);
      setError(
        "Sesión desconectada. En modo n8n, la reconexión es gestionada externamente.",
      );
      return;
    }

    if (!lastSessionParamsRef.current || isReconnecting) return;

    // Global cycle limit: stop if we've exhausted all cycles
    if (reconnectCycleCountRef.current >= MAX_RECONNECT_CYCLES) {
      setIsStarting(false);
      setError(t.reconnectFailed || "Could not reconnect. Please try again.");
      lastSessionParamsRef.current = null;
      return;
    }

    // Fast-disconnect detection: if last session lived < 10s, the problem is persistent
    const timeSinceLastSession = Date.now() - lastSessionStartTimeRef.current;
    const MIN_SESSION_DURATION_MS = 10_000;

    if (
      lastSessionStartTimeRef.current > 0 &&
      timeSinceLastSession < MIN_SESSION_DURATION_MS
    ) {
      setIsStarting(false);
      setError(t.reconnectFailed || "Could not reconnect. Please try again.");
      lastSessionParamsRef.current = null;
      reportErrorToWebhook(
        buildErrorReport(
          "RECONNECT_ABORTED_FAST_DISCONNECT",
          `Session disconnected after ${Math.floor(timeSinceLastSession / 1000)}s`,
          "connection",
          idInteraction || "",
          {
            context: `Fast disconnect (${timeSinceLastSession}ms < ${MIN_SESSION_DURATION_MS}ms)`,
          },
        ),
      );
      return;
    }

    reconnectCycleCountRef.current += 1;
    setIsReconnecting(true);
    setSessionToken(""); // Unmount current session

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      setReconnectAttempt(attempt);
      try {
        // Backoff: immediate, 2s, 4s
        if (attempt > 1) {
          await new Promise((r) => setTimeout(r, (attempt - 1) * 2000));
        }

        const newToken = await createSessionFromParams(
          lastSessionParamsRef.current!,
        );

        lastSessionStartTimeRef.current = Date.now();
        setSessionToken(newToken);
        setIsReconnecting(false);
        setReconnectAttempt(0);

        reportErrorToWebhook(
          buildErrorReport(
            "RECONNECT_SUCCESS",
            `Reconnected on attempt ${attempt} (cycle ${reconnectCycleCountRef.current})`,
            "connection",
            idInteraction || "",
            {
              context: `Reconnection attempt ${attempt} of ${MAX_RECONNECT_ATTEMPTS}, cycle ${reconnectCycleCountRef.current} of ${MAX_RECONNECT_CYCLES}`,
            },
          ),
        );
        return;
      } catch (err) {
        console.error(`Reconnect attempt ${attempt} failed:`, err);
      }
    }

    // All attempts in this cycle failed
    setIsReconnecting(false);
    setReconnectAttempt(0);
    setIsStarting(false);
    setError(t.reconnectFailed || "Could not reconnect. Please try again.");

    reportErrorToWebhook(
      buildErrorReport(
        "RECONNECT_FAILED",
        `All ${MAX_RECONNECT_ATTEMPTS} reconnection attempts failed (cycle ${reconnectCycleCountRef.current})`,
        "connection",
        idInteraction || "",
        { context: "Auto-reconnection exhausted" },
      ),
    );
  }, [
    isReconnecting,
    isModoN8n,
    idInteraction,
    createSessionFromParams,
    t.reconnectFailed,
  ]);

  const onSessionStopped = () => {
    lastSessionParamsRef.current = null;
    setSessionToken("");
    setIsStarting(false);
    setShowNoExerciseScreen(false);
  };

  const onSessionComplete = () => {
    lastSessionParamsRef.current = null;
    setShowEndScreen(true);
    setSessionToken("");
    setIsStarting(false);
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-white"
      style={{
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {!sessionToken ? (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 md:px-8">
          {/* Card Container */}
          <div className="w-full rounded-2xl p-6 md:p-12 flex flex-col items-center justify-center gap-6 md:gap-8">
            {isWaitingN8nSession ? (
              <>
                {/* Waiting for n8n session UI */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    Esperando sesión...
                  </h2>
                  <p className="text-gray-500 text-sm md:text-base text-center">
                    La sesión está siendo configurada desde n8n.
                    <br />
                    Por favor espere...
                  </p>
                </div>
              </>
            ) : isReconnecting ? (
              <>
                {/* Reconnection UI */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    {t.reconnecting}
                  </h2>
                  <p className="text-gray-500 text-sm md:text-base">
                    {t.reconnectAttempt} {reconnectAttempt} {t.reconnectOf}{" "}
                    {MAX_RECONNECT_ATTEMPTS}
                  </p>
                </div>
              </>
            ) : showEndScreen ? (
              <>
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <h1 className="text-gray-900 text-xl md:text-3xl font-bold tracking-wide">
                    {t.title}
                  </h1>
                </div>
                <div className="bg-gray-50 px-6 md:px-8 py-4 md:py-6 rounded-xl border border-gray-200">
                  <p className="text-base md:text-xl text-gray-800 font-medium text-center leading-relaxed">
                    {t.thankYou}
                  </p>
                </div>
              </>
            ) : showNoExerciseScreen ? (
              <>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                  {t.noExerciseTitle}
                </h2>
                <p className="text-base md:text-lg text-gray-600 text-center">
                  {t.returnToWhatsapp}
                </p>
              </>
            ) : (
              <>
                {/* Header with Logos */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-4 md:mb-8">
                  <img
                    src="/Entrenador.ai-logo.png"
                    alt="Entrenador.ai"
                    className="h-8 md:h-12 object-contain"
                  />
                  <div className="hidden md:block w-px h-8 md:h-10 bg-gray-300"></div>
                  <img
                    src="/Inteliventa-logo.png"
                    alt="Inteliventa"
                    className="h-6 md:h-10 object-contain"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-red-600 bg-red-50 px-4 md:px-6 py-2 md:py-3 rounded-lg border border-red-200 text-sm md:text-base">
                    {error}
                  </div>
                )}

                {/* Start / Retry Button */}
                {!isWebhookReady ? (
                  <div className="text-gray-500 text-sm md:text-base animate-pulse">
                    {t.loading}
                  </div>
                ) : !isStarting ? (
                  <button
                    onClick={handleStart}
                    className="min-h-[48px] px-6 md:px-8 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation text-sm md:text-base"
                  >
                    {error ? t.retry || "Retry" : t.startConnection}
                  </button>
                ) : (
                  <div className="text-gray-600 text-base md:text-lg animate-pulse">
                    {t.starting}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <LiveAvatarSession
          mode={mode}
          sessionAccessToken={sessionToken}
          onSessionStopped={onSessionStopped}
          onSessionComplete={onSessionComplete}
          onDisconnected={handleDisconnected}
          idInteraction={idInteraction || ""}
          initialTimerSeconds={timerSeconds}
          language={currentLanguage}
        />
      )}
    </div>
  );
};

export const LiveAvatarDemo = () => {
  return (
    <Suspense fallback={<div className="text-gray-600">Cargando...</div>}>
      <LiveAvatarDemoContent />
    </Suspense>
  );
};
