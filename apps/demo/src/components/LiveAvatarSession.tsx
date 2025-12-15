"use client";

import React, { useEffect, useRef } from "react";
import {
  LiveAvatarContextProvider,
  useSession,
  useVoiceChat,
  useChatHistory,
  useLiveAvatarContext,
} from "../liveavatar";
import { SessionState } from "@heygen/liveavatar-web-sdk";
import { TargetIcon } from "./Icons";

// Helper for formatting time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const LiveAvatarSessionComponent: React.FC<{
  mode: "FULL" | "CUSTOM";
  onSessionStopped: () => void;
  onSessionComplete?: () => void;
  idInteraction: string;
  initialTimerSeconds?: number | null;
}> = ({
  mode: _mode,
  onSessionStopped,
  onSessionComplete,
  idInteraction,
  initialTimerSeconds,
}) => {
  const {
    sessionState,
    isStreamReady,
    startSession,
    stopSession,
    attachElement,
  } = useSession();
  const { start, isActive } = useVoiceChat();
  const { sessionRef } = useLiveAvatarContext(); // Get sessionRef to match manual logic with event listener
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // console.warn("[UI] sessionState changed:", sessionState);
  }, [sessionState]);

  useEffect(() => {
    if (isStreamReady && videoRef.current) {
      attachElement(videoRef.current);
    }
  }, [attachElement, isStreamReady]);

  useEffect(() => {
    if (sessionState === SessionState.INACTIVE) {
      startSession().catch(console.error);
    }
  }, [startSession, sessionState]);

  useEffect(() => {
    if (isStreamReady && !isActive) {
      start();
    }
  }, [isStreamReady, isActive, start]);

  // Local manual stopwatch hook logic (Requested by user to imitate)
  const [manualTimer, setManualTimer] = React.useState(0);
  const [manualTimerRunning, setManualTimerRunning] = React.useState(false);
  const manualIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to initialize manual timer if prop is present (so it shows correct start value visually if we decide to show it static,
  // or just to ensure it starts from correct value)
  useEffect(() => {
    if (typeof initialTimerSeconds === "number") {
      setManualTimer(initialTimerSeconds);
      // User requested: Auto-start as soon as we have webhook data
      startManualTimer();
    }
  }, [initialTimerSeconds]);

  useEffect(() => {
    return () => {
      if (manualIntervalRef.current) {
        clearInterval(manualIntervalRef.current);
      }
    };
  }, []);

  const startManualTimer = () => {
    if (manualIntervalRef.current) return;

    // Explicitly set start value on click (redundant if effect ran, but safe)
    if (typeof initialTimerSeconds === "number") {
      setManualTimer(initialTimerSeconds);
    } else {
      setManualTimer(0);
    }

    setManualTimerRunning(true);

    manualIntervalRef.current = setInterval(() => {
      setManualTimer((prev) => {
        // User requested: Always count UP
        return prev + 1;
      });
    }, 1000);
  };

  const messages = useChatHistory();

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-8 p-4 md:py-8 md:px-8 min-h-0 max-h-full overflow-y-auto md:overflow-hidden relative">
      {/* Left Column: Header + Avatar */}
      <div className="flex-shrink-0 md:flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
        <div className="flex flex-row items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-pink-500/20 rounded-full">
            <TargetIcon className="text-pink-500 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h1 className="text-base md:text-xl font-black uppercase tracking-wider text-white">
            ENTRENADOR AI
          </h1>
        </div>

        {/* Avatar Video Container */}
        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-sm border border-white/10 w-full max-h-[50vh] md:max-h-none md:flex-1 aspect-video md:aspect-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* New Independent Manual Stopwatch (Requested) */}
          {manualTimerRunning && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-blue-600/60 backdrop-blur-md border border-blue-400/30 text-white px-4 py-1 rounded-full font-mono font-bold text-lg shadow-lg flex items-center gap-2">
                <span>⏱️</span>
                {formatTime(manualTimer)}
              </div>
            </div>
          )}

          {sessionState === SessionState.DISCONNECTED && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-3 md:mb-4">
                <svg
                  className="w-6 h-6 md:w-8 md:h-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 9V14"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 17.01L12.01 16.9989"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">
                Sesión Finalizada
              </h3>
              <p className="text-white/60 mb-4 md:mb-6 text-center max-w-xs text-sm md:text-base">
                La conexión se ha perdido o no se pudo establecer.
              </p>
              <button
                onClick={onSessionStopped}
                className="min-h-[44px] px-5 md:px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors touch-manipulation text-sm md:text-base"
              >
                Volver al Inicio
              </button>
            </div>
          )}

          {/* Desktop Controls */}
          <div className="hidden md:flex absolute top-6 right-6 flex-col gap-2 items-end">
            {/* Existing End Button */}
            <button
              className="min-h-[44px] bg-red-500/80 hover:bg-red-600 text-white px-6 py-2 rounded-full backdrop-blur-md transition-all duration-200 font-medium shadow-lg touch-manipulation active:scale-95 text-base"
              onClick={async () => {
                try {
                  await fetch(
                    "https://devwebhook.inteliventa.ai/webhook/liveavatar",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        Estado: "Terminar ejercicio",
                        id_interaccion: idInteraction,
                      }),
                    },
                  );
                } catch {
                  console.error("Webhook error");
                }
                stopSession();
                if (onSessionComplete) {
                  onSessionComplete();
                } else {
                  window.open("https://wa.me/+56950164862", "_blank");
                }
              }}
            >
              Terminar ejercicio
            </button>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden w-full flex flex-col gap-2">
          <button
            className="w-full min-h-[48px] bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg touch-manipulation active:scale-[0.98] text-sm"
            onClick={async () => {
              try {
                await fetch(
                  "https://devwebhook.inteliventa.ai/webhook/liveavatar",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      Estado: "Terminar ejercicio",
                      id_interaccion: idInteraction,
                    }),
                  },
                );
              } catch {
                console.error("Webhook error");
              }
              stopSession();
              if (onSessionComplete) {
                onSessionComplete();
              } else {
                window.open("https://wa.me/+56950164862", "_blank");
              }
            }}
          >
            Terminar ejercicio
          </button>
        </div>
      </div>

      {/* Transcription/Chat Area */}
      <div className="flex-shrink-0 md:flex-shrink w-full md:w-[400px] flex flex-col rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md border border-white/10 min-h-0 max-h-[40vh] md:max-h-none">
        <div className="p-4 md:p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-lg md:text-2xl font-bold text-white tracking-wide">
            Transcripción en vivo
          </h2>
          <p className="text-white/60 text-xs md:text-sm mt-1">Escuchando...</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
          {messages &&
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span
                  className={`text-xs mb-1 px-2 ${msg.sender === "user" ? "text-blue-300" : "text-pink-300"}`}
                >
                  {msg.sender === "user" ? "Tú" : "Avatar"}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 md:px-5 py-2 md:py-3 text-sm md:text-base ${
                    msg.sender === "user"
                      ? "bg-blue-600/80 text-white rounded-tr-sm"
                      : "bg-pink-600/80 text-white rounded-tl-sm"
                  } backdrop-blur-sm shadow-sm border border-white/5 leading-relaxed`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
          {messages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3 md:space-y-4">
              <svg
                className="w-10 h-10 md:w-12 md:h-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
                <path d="M8 12h8" />
                <path d="M8 10h8" />
              </svg>
              <p className="text-sm md:text-base">
                La conversación aparecerá aquí
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LiveAvatarSession: React.FC<{
  mode: "FULL" | "CUSTOM";
  sessionAccessToken: string;
  onSessionStopped: () => void;
  onSessionComplete?: () => void;
  idInteraction: string;
  initialTimerSeconds?: number | null;
}> = ({
  mode,
  sessionAccessToken,
  onSessionStopped,
  onSessionComplete,
  idInteraction,
  initialTimerSeconds,
}) => {
  return (
    <LiveAvatarContextProvider
      sessionAccessToken={sessionAccessToken}
      idInteraction={idInteraction}
      onSessionComplete={onSessionComplete}
      initialTimerSeconds={initialTimerSeconds}
    >
      <LiveAvatarSessionComponent
        mode={mode}
        onSessionStopped={onSessionStopped}
        onSessionComplete={onSessionComplete}
        idInteraction={idInteraction}
        initialTimerSeconds={initialTimerSeconds}
      />
    </LiveAvatarContextProvider>
  );
};
