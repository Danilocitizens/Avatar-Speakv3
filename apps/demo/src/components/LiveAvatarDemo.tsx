"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveAvatarSession } from "./LiveAvatarSession";

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

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      // Webhook Validation
      const webhookResponse = await fetch(
        "https://devwebhook.inteliventa.ai/webhook/liveavatar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_interaccion: idInteraction || "" }),
        },
      );
      const webhookData = await webhookResponse.json();
      console.warn("Start Session Webhook Data:", webhookData);

      // Parse inicio_seg
      if (
        webhookData.inicio_seg &&
        webhookData.inicio_seg !== "no disponible"
      ) {
        // Log the raw value
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

      let dynamicKnowledgeId = null;
      // User specified webhook returns CONTEXT_ID when "disponible"
      if (webhookData.respuesta === "disponible" && webhookData.CONTEXT_ID) {
        dynamicKnowledgeId = webhookData.CONTEXT_ID;
      } else if (webhookData.knowledge_id) {
        // Fallback if they send it as knowledge_id
        dynamicKnowledgeId = webhookData.knowledge_id;
      }

      // If no ID is found, show the "No Exercise" screen instead of erroring
      if (!dynamicKnowledgeId) {
        console.warn(
          "No CONTEXT_ID provided by webhook. Showing No Exercise screen.",
        );
        setShowNoExerciseScreen(true);
        setIsStarting(false);
        return;
      }

      // Proceed to start session with dynamic context
      const res = await fetch("/api/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_id: dynamicKnowledgeId,
          voice_id: webhookData.voice_id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        setError(error.error);
        setIsStarting(false);
        return;
      }
      const { session_token } = await res.json();

      // Parse inicio_seg BEFORE setting session token
      let parsedTimer: number | null = null;
      if (
        webhookData.inicio_seg &&
        webhookData.inicio_seg !== "no disponible"
      ) {
        console.warn("webhookData.inicio_seg found:", webhookData.inicio_seg);
        const parsed = parseInt(webhookData.inicio_seg, 10);
        if (!isNaN(parsed)) {
          console.warn("Parsed timerSeconds:", parsed);
          parsedTimer = parsed;
        } else {
          console.warn("Failed to parse timerSeconds, setting null");
        }
      } else {
        console.warn("inicio_seg not found or no disponible");
      }

      setTimerSeconds(parsedTimer);
      setSessionToken(session_token);
      setMode("FULL");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setError(error.message || "Error al iniciar sesión");
      setIsStarting(false);
    }
  };

  const onSessionStopped = () => {
    // Reset the FE state
    setSessionToken("");
    setIsStarting(false);
    setShowNoExerciseScreen(false);
    // Note: Do not reset showEndScreen here if it was set by webhook,
    // but usually onStopped is called by "Finalizar" button too.
    // If webhook triggered end, showEndScreen is true.
    // If manual stop, showEndScreen should probably be false?
    // For now, only reset if we want to go back to start.
    // However, if we are showing End Screen, we stay there.
  };

  const onSessionComplete = () => {
    setShowEndScreen(true);
    setSessionToken(""); // Stop showing session
    setIsStarting(false);
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #4169E1 0%, #1E3A8A 100%)",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {!sessionToken ? (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 md:px-8">
          {/* Card Container */}
          <div
            className="w-full rounded-2xl p-6 md:p-12 flex flex-col items-center justify-center gap-6 md:gap-8"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            {showEndScreen ? (
              <>
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <h1 className="text-white text-xl md:text-3xl font-bold tracking-wide">
                    ENTRENADOR AI
                  </h1>
                </div>
                <div className="bg-white/10 px-6 md:px-8 py-4 md:py-6 rounded-xl border border-white/5 backdrop-blur-md">
                  <p className="text-base md:text-xl text-white font-medium text-center leading-relaxed">
                    Gracias. Ahora vuelve a WhatsApp para continuar
                  </p>
                </div>
              </>
            ) : showNoExerciseScreen ? (
              <>
                <h2 className="text-xl md:text-2xl font-bold text-white text-center">
                  Todavía no tienes un ejercicio
                </h2>
                <p className="text-base md:text-lg text-white/70 text-center">
                  Puedes volver a WhatsApp para continuar
                </p>
              </>
            ) : (
              <>
                {/* Header with Icon and Title */}
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <div
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #FF1493 0%, #FF69B4 100%)",
                      boxShadow: "0 0 20px rgba(255, 20, 147, 0.5)",
                    }}
                  >
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="3" fill="white" />
                    </svg>
                  </div>
                  <h1 className="text-white text-xl md:text-3xl font-bold tracking-wide">
                    ENTRENADOR AI
                  </h1>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-red-400 bg-red-900/30 px-4 md:px-6 py-2 md:py-3 rounded-lg border border-red-500/50 text-sm md:text-base">
                    {error}
                  </div>
                )}

                {/* Start Button */}
                {!isStarting ? (
                  <button
                    onClick={handleStart}
                    className="min-h-[48px] px-6 md:px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation text-sm md:text-base"
                    style={{
                      background: "rgba(59, 130, 246, 0.8)",
                      border: "1px solid rgba(96, 165, 250, 0.5)",
                      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    Empezar ejercicio
                  </button>
                ) : (
                  <div className="text-white text-base md:text-lg animate-pulse">
                    Iniciando sesión...
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
          idInteraction={idInteraction || ""}
          initialTimerSeconds={timerSeconds}
        />
      )}
    </div>
  );
};

export const LiveAvatarDemo = () => {
  return (
    <Suspense fallback={<div className="text-white">Cargando...</div>}>
      <LiveAvatarDemoContent />
    </Suspense>
  );
};
