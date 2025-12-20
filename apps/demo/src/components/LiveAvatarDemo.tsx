"use client";

import { useState, Suspense, useEffect } from "react";
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

  // Automatic webhook trigger on page load (Requested feature)
  useEffect(() => {
    // Define the async function inside the effect
    const triggerOnLoad = async () => {
      try {
        await fetch("https://devwebhook.inteliventa.ai/webhook/liveavatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_interaccion: idInteraction || "" }),
        });
        // console.log("Automatic entrance webhook fired for:", idInteraction);
      } catch (err) {
        console.error("Failed to fire automatic entrance webhook:", err);
      }
    };

    triggerOnLoad();
    // Depends on idInteraction so if it changes (or on mount) it fires.
    // If we want strictly ONLY on mount, we can use empty array, but usually idInteraction is key.
    // Given the request "cada vez que el usuario entre", triggering on mount is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          avatar_id: webhookData.avatar_id,
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
        const parsed = parseInt(webhookData.inicio_seg, 10);
        if (!isNaN(parsed)) {
          parsedTimer = parsed;
        }
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
            {showEndScreen ? (
              <>
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  <h1 className="text-gray-900 text-xl md:text-3xl font-bold tracking-wide">
                    ENTRENADOR AI
                  </h1>
                </div>
                <div className="bg-gray-50 px-6 md:px-8 py-4 md:py-6 rounded-xl border border-gray-200">
                  <p className="text-base md:text-xl text-gray-800 font-medium text-center leading-relaxed">
                    Gracias. Ahora vuelve a WhatsApp para continuar
                  </p>
                </div>
              </>
            ) : showNoExerciseScreen ? (
              <>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center">
                  Todavía no tienes un ejercicio
                </h2>
                <p className="text-base md:text-lg text-gray-600 text-center">
                  Puedes volver a WhatsApp para continuar
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
                  <div className="text-red-400 bg-red-900/30 px-4 md:px-6 py-2 md:py-3 rounded-lg border border-red-500/50 text-sm md:text-base">
                    {error}
                  </div>
                )}

                {/* Start Button */}
                {!isStarting ? (
                  <button
                    onClick={handleStart}
                    className="min-h-[48px] px-6 md:px-8 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation text-sm md:text-base"
                  >
                    Empezar ejercicio
                  </button>
                ) : (
                  <div className="text-gray-600 text-base md:text-lg animate-pulse">
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
    <Suspense fallback={<div className="text-gray-600">Cargando...</div>}>
      <LiveAvatarDemoContent />
    </Suspense>
  );
};
