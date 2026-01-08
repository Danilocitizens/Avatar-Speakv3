"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LiveAvatarContextProvider,
  useSession,
  useVoiceChat,
  useChatHistory,
  useLiveAvatarContext,
  useTextChat,
} from "../liveavatar";
import { SessionState } from "@heygen/liveavatar-web-sdk";
import { TargetIcon, StopwatchIcon } from "./Icons";
import { translations, Language } from "../constants/translations";

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
  language: Language;
}> = ({
  mode: _mode,
  onSessionStopped,
  onSessionComplete,
  idInteraction,
  initialTimerSeconds,
  language,
}) => {
  const t = translations[language];
  const {
    sessionState,
    isStreamReady,
    startSession,
    stopSession,
    attachElement,
  } = useSession();
  const { start, isActive, mute, unmute, isMuted, isAvatarTalking } =
    useVoiceChat();
  const { sendMessage } = useTextChat("FULL");
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
      start().catch((err) => {
        console.error("Failed to start voice chat:", err);
      });
    }
  }, [isStreamReady, isActive, start]);

  // Auto-mute microphone when avatar is speaking on mobile to prevent echo/feedback loop
  // Mobile browsers have less effective echo cancellation than desktop browsers
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!isMobile || !isActive) return;

    if (isAvatarTalking && !isMuted) {
      mute().catch((err) => {
        console.error("Failed to mute during avatar speech:", err);
      });
    } else if (!isAvatarTalking && isMuted) {
      unmute().catch((err) => {
        console.error("Failed to unmute after avatar speech:", err);
      });
    }
  }, [isAvatarTalking, isActive, isMuted, mute, unmute]);

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

  // Text input state
  const [textInput, setTextInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendTextMessage = async () => {
    if (!textInput.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(textInput);
      setTextInput("");
    } catch (error) {
      console.error("Failed to send text message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-8 p-4 md:py-8 md:px-8 min-h-0 max-h-full overflow-y-auto md:overflow-hidden relative">
      {/* Left Column: Header + Avatar */}
      <div className="flex-shrink-0 md:flex-1 flex flex-col gap-3 md:gap-4 min-h-0">
        <div className="flex flex-row items-center gap-4 md:gap-6">
          <img
            src="/Entrenador.ai-logo.png"
            alt="Entrenador.ai"
            className="h-8 object-contain"
          />
          <div className="w-px h-6 bg-gray-300"></div>
          <img
            src="/Inteliventa-logo.png"
            alt="Inteliventa"
            className="h-6 object-contain"
          />

          {/* Mobile Header Timer (New Position) */}
          {manualTimerRunning && (
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <div className="bg-[#1B2138] border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                <StopwatchIcon
                  size={16}
                  className="text-pink-400 stroke-[2.5px]"
                />
                <span className="text-white font-mono font-bold text-sm tracking-wide tabular-nums">
                  {formatTime(manualTimer)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Video Container */}
        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-gray-50 border border-gray-200 w-full max-h-[50vh] md:max-h-none md:flex-1 aspect-video md:aspect-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* New Independent Manual Stopwatch (Requested) */}
          {manualTimerRunning && (
            <div className="hidden md:flex absolute top-8 left-1/2 transform -translate-x-1/2 z-50">
              <div
                className="flex items-center gap-3 px-6 py-2 rounded-full text-white shadow-2xl backdrop-blur-md border border-white/10"
                style={{
                  backgroundColor: "#1B2138", // Dark navy/indigo background
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                  fontFamily: "monospace", // Or a nice tabular font if available
                }}
              >
                <div className="text-pink-400">
                  <StopwatchIcon size={20} className="stroke-[2.5px]" />
                </div>
                <span className="text-2xl font-bold tracking-widest tabular-nums">
                  {formatTime(manualTimer)}
                </span>
              </div>
            </div>
          )}

          {sessionState === SessionState.DISCONNECTED && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md text-gray-900 p-4 md:p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-100 flex items-center justify-center mb-3 md:mb-4">
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
                {t.sessionEnded}
              </h3>
              <p className="text-gray-500 mb-4 md:mb-6 text-center max-w-xs text-sm md:text-base">
                {t.connectionLost}
              </p>
              <button
                onClick={onSessionStopped}
                className="min-h-[44px] px-5 md:px-6 py-2 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors touch-manipulation text-sm md:text-base"
              >
                {t.returnHome}
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
                        Estado: t.endSession,
                        id_interaccion: idInteraction,
                        tiempo_consumido: manualTimer,
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
              {t.endSession}
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
                      Estado: t.endSession,
                      id_interaccion: idInteraction,
                      tiempo_consumido: manualTimer,
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
            {t.endSession}
          </button>
        </div>
      </div>

      {/* Transcription/Chat Area */}
      <div className="flex-shrink-0 md:flex-shrink w-full md:w-[400px] flex flex-col rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 min-h-0 max-h-[40vh] md:max-h-none">
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 tracking-wide">
            {t.liveTranscription}
          </h2>
          <p className="text-gray-500 text-xs md:text-sm mt-1">{t.listening}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
          {messages &&
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span
                  className={`text-xs mb-1 px-2 ${msg.sender === "user" ? "text-blue-600" : "text-pink-600"}`}
                >
                  {msg.sender === "user" ? t.you : t.avatar}
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
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 md:space-y-4">
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
                {t.conversationPlaceholder}
              </p>
            </div>
          )}
        </div>

        {/* Text Input Section */}
        <div className="p-3 md:p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.textInputPlaceholder}
              disabled={isSending}
              className="flex-1 min-h-[44px] px-4 py-2 bg-white border border-gray-200 rounded-full text-sm md:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendTextMessage}
              disabled={!textInput.trim() || isSending}
              className="min-h-[44px] min-w-[44px] md:px-5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 font-medium shadow-md touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {/* Send Icon */}
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              <span className="hidden md:inline">{t.sendMessage}</span>
            </button>
          </div>
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
  language: Language;
}> = ({
  mode,
  sessionAccessToken,
  onSessionStopped,
  onSessionComplete,
  idInteraction,
  initialTimerSeconds,
  language,
}) => {
  return (
    <LiveAvatarContextProvider
      key={sessionAccessToken} // Force remount/new session if token changes
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
        language={language}
      />
    </LiveAvatarContextProvider>
  );
};
