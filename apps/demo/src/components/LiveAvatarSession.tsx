"use client";

import React, { useEffect, useRef } from "react";
import {
  LiveAvatarContextProvider,
  useSession,
  useVoiceChat,
  useChatHistory,
} from "../liveavatar";
import { SessionState } from "@heygen/liveavatar-web-sdk";
import { TargetIcon } from "./Icons";

const LiveAvatarSessionComponent: React.FC<{
  mode: "FULL" | "CUSTOM";
  onSessionStopped: () => void;
  onSessionComplete?: () => void;
  idInteraction: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ mode: _mode, onSessionStopped, onSessionComplete, idInteraction }) => {
  const {
    sessionState,
    isStreamReady,
    startSession,
    stopSession,
    attachElement,
  } = useSession();
  const { start, isActive } = useVoiceChat();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.warn("[UI] sessionState changed:", sessionState);
    // Removed auto-redirect on DISCONNECTED to allow user to see error state
    // useEffect(() => {
    //   if (sessionState === SessionState.DISCONNECTED) {
    //     onSessionStopped();
    //   }
    // }, [sessionState, onSessionStopped]);
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

  const messages = useChatHistory();

  return (
    <div className="w-full h-full flex flex-row items-stretch justify-center gap-8 py-8 px-8 min-h-0 max-h-full">
      {/* Left Column: Header + Avatar */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="flex flex-row items-center gap-3">
          <div className="p-2 bg-pink-500/20 rounded-full">
            <TargetIcon className="text-pink-500 w-6 h-6" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            ENTRENADOR AI
          </h1>
        </div>

        {/* Avatar Video Container */}
        <div className="flex-1 relative rounded-3xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-sm border border-white/10 w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {sessionState === SessionState.DISCONNECTED && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <svg
                  width="32"
                  height="32"
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
              <h3 className="text-xl font-bold mb-2">Sesión Finalizada</h3>
              <p className="text-white/60 mb-6 text-center max-w-xs">
                La conexión se ha perdido o no se pudo establecer.
              </p>
              <button
                onClick={onSessionStopped}
                className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          )}
          <button
            className="absolute top-6 right-6 bg-red-500/80 hover:bg-red-600 text-white px-6 py-2 rounded-full backdrop-blur-md transition-all duration-200 font-medium shadow-lg"
            onClick={async () => {
              // Send webhook notification for manual termination
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
      <div className="w-[400px] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md border border-white/10 min-h-0">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-2xl font-bold text-white tracking-wide">
            Transcripción en vivo
          </h2>
          <p className="text-white/60 text-sm mt-1">Escuchando...</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  className={`max-w-[85%] rounded-2xl px-5 py-3 ${
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
            <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
                <path d="M8 12h8" />
                <path d="M8 10h8" />
              </svg>
              <p>La conversación aparecerá aquí</p>
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
}> = ({
  mode,
  sessionAccessToken,
  onSessionStopped,
  onSessionComplete,
  idInteraction,
}) => {
  return (
    <LiveAvatarContextProvider
      sessionAccessToken={sessionAccessToken}
      idInteraction={idInteraction}
      onSessionComplete={onSessionComplete}
    >
      <LiveAvatarSessionComponent
        mode={mode}
        onSessionStopped={onSessionStopped}
        onSessionComplete={onSessionComplete}
        idInteraction={idInteraction}
      />
    </LiveAvatarContextProvider>
  );
};
