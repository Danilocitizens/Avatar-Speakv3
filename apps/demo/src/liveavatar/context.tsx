import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ConnectionQuality,
  LiveAvatarSession,
  SessionState,
  SessionEvent,
  VoiceChatEvent,
  VoiceChatState,
  AgentEventsEnum,
} from "@heygen/liveavatar-web-sdk";
import { LiveAvatarSessionMessage, MessageSender } from "./types";
import { API_URL } from "../../app/api/secrets";

type LiveAvatarContextProps = {
  sessionRef: React.RefObject<LiveAvatarSession>;

  isMuted: boolean;
  voiceChatState: VoiceChatState;

  sessionState: SessionState;
  isStreamReady: boolean;
  connectionQuality: ConnectionQuality;

  isUserTalking: boolean;
  isAvatarTalking: boolean;

  messages: LiveAvatarSessionMessage[];

  timerValue: number | null;
  showTimer: boolean;
};

export const LiveAvatarContext = createContext<LiveAvatarContextProps>({
  sessionRef: {
    current: null,
  } as unknown as React.RefObject<LiveAvatarSession>,
  connectionQuality: ConnectionQuality.UNKNOWN,
  isMuted: true,
  voiceChatState: VoiceChatState.INACTIVE,
  sessionState: SessionState.DISCONNECTED,
  isStreamReady: false,
  isUserTalking: false,
  isAvatarTalking: false,
  messages: [],
  timerValue: null,
  showTimer: false,
});

type LiveAvatarContextProviderProps = {
  children: React.ReactNode;
  sessionAccessToken: string;
  idInteraction: string;
  onSessionComplete?: () => void;
  initialTimerSeconds?: number | null;
};

const useSessionState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [sessionState, setSessionState] = useState<SessionState>(
    sessionRef.current?.state || SessionState.INACTIVE,
  );
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    sessionRef.current?.connectionQuality || ConnectionQuality.UNKNOWN,
  );
  const [isStreamReady, setIsStreamReady] = useState<boolean>(false);

  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        setSessionState(state);
        if (state === SessionState.DISCONNECTED) {
          sessionRef.current.removeAllListeners();
          sessionRef.current.voiceChat.removeAllListeners();
          setIsStreamReady(false);
        }
      });
      sessionRef.current.on(SessionEvent.SESSION_STREAM_READY, () => {
        setIsStreamReady(true);
      });
      sessionRef.current.on(
        SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED,
        setConnectionQuality,
      );
    }
  }, [sessionRef]);

  return { sessionState, isStreamReady, connectionQuality };
};

const useVoiceChatState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [isMuted, setIsMuted] = useState(true);
  const [voiceChatState, setVoiceChatState] = useState<VoiceChatState>(
    sessionRef.current?.voiceChat.state || VoiceChatState.INACTIVE,
  );

  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.voiceChat.on(VoiceChatEvent.MUTED, () => {
        setIsMuted(true);
      });
      sessionRef.current.voiceChat.on(VoiceChatEvent.UNMUTED, () => {
        setIsMuted(false);
      });
      sessionRef.current.voiceChat.on(
        VoiceChatEvent.STATE_CHANGED,
        setVoiceChatState,
      );
    }
  }, [sessionRef]);

  return { isMuted, voiceChatState };
};

const useTalkingState = (sessionRef: React.RefObject<LiveAvatarSession>) => {
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);

  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
        setIsUserTalking(true);
      });
      sessionRef.current.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
        setIsUserTalking(false);
      });
      sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setIsAvatarTalking(true);
      });
      sessionRef.current.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setIsAvatarTalking(false);
      });
    }
  }, [sessionRef]);

  return { isUserTalking, isAvatarTalking };
};

const useTimerState = (
  sessionRef: React.RefObject<LiveAvatarSession>,
  initialSeconds?: number | null,
) => {
  const [timerValue, setTimerValue] = useState<number | null>(null);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);

  useEffect(() => {
    if (typeof initialSeconds === "number" && initialSeconds !== null) {
      setTimerValue(initialSeconds);
    } else {
      setTimerValue(null);
    }
    setHasTimerStarted(false);
  }, [initialSeconds]);

  useEffect(() => {
    const session = sessionRef.current;
    if (
      session &&
      typeof initialSeconds === "number" &&
      initialSeconds !== null
    ) {
      const handleAvatarSpeakStart = () => {
        if (!hasTimerStarted) {
          setHasTimerStarted(true);
        }
      };
      // We only listen if timer hasn't started yet
      if (!hasTimerStarted) {
        session.on(
          AgentEventsEnum.AVATAR_SPEAK_STARTED,
          handleAvatarSpeakStart,
        );
      }
      return () => {
        session.off(
          AgentEventsEnum.AVATAR_SPEAK_STARTED,
          handleAvatarSpeakStart,
        );
      };
    }
  }, [sessionRef, initialSeconds, hasTimerStarted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hasTimerStarted && timerValue !== null && timerValue > 0) {
      interval = setInterval(() => {
        setTimerValue((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasTimerStarted, timerValue]);

  return {
    timerValue,
    showTimer: typeof initialSeconds === "number" && initialSeconds !== null,
  };
};

const useChatHistoryState = (
  sessionRef: React.RefObject<LiveAvatarSession>,
  idInteraction: string,
  onSessionComplete?: () => void,
) => {
  const [messages, setMessages] = useState<LiveAvatarSessionMessage[]>([]);
  const avatarTranscriptBuffer = useRef("");

  useEffect(() => {
    const session = sessionRef.current;
    if (session) {
      const handleMessage = (sender: MessageSender, message: string) => {
        setMessages((prev) => [
          ...prev,
          {
            sender: sender,
            message,
            timestamp: Date.now(),
          },
        ]);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleUserTranscription = async (data: any) => {
        console.warn("USER_TRANSCRIPTION", data);
        if (data.text) {
          handleMessage(MessageSender.USER, data.text);

          // Webhook logic
          try {
            fetch("https://devwebhook.inteliventa.ai/webhook/liveavatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "USER_END_MESSAGE",
                text: data.text,
                avatar_text: avatarTranscriptBuffer.current,
                id_interaccion: idInteraction || "",
                timestamp: new Date().toISOString(),
              }),
            })
              .then(async (res) => {
                try {
                  const data = await res.json();
                  if (data.respuesta === "ok") {
                    await session.stop();
                    // Trigger completion callback to show End Screen
                    if (onSessionComplete) {
                      onSessionComplete();
                    }
                  }
                } catch (e) {
                  console.error("Error parsing webhook response:", e);
                }
              })
              .catch((err) => {
                console.error("Webhook Send Error (Silenced):", err);
              });
          } catch (e) {
            console.error("Webhook Error:", e);
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleAvatarTranscription = (data: any) => {
        console.warn("AVATAR_TRANSCRIPTION", data);
        if (data.text) {
          handleMessage(MessageSender.AVATAR, data.text);
          avatarTranscriptBuffer.current = data.text; // Update buffer
        }
      };

      const handleAvatarSpeakStarted = () => {
        // Optionally clear buffer on new start IF needed.
        // But for now, we just keep updating the buffer on transcription events.
        avatarTranscriptBuffer.current = "";
      };

      session.on(AgentEventsEnum.USER_TRANSCRIPTION, handleUserTranscription);
      session.on(
        AgentEventsEnum.AVATAR_TRANSCRIPTION,
        handleAvatarTranscription,
      );
      session.on(
        AgentEventsEnum.AVATAR_SPEAK_STARTED,
        handleAvatarSpeakStarted,
      );

      return () => {
        session.off(
          AgentEventsEnum.USER_TRANSCRIPTION,
          handleUserTranscription,
        );
        session.off(
          AgentEventsEnum.AVATAR_TRANSCRIPTION,
          handleAvatarTranscription,
        );
        session.off(
          AgentEventsEnum.AVATAR_SPEAK_STARTED,
          handleAvatarSpeakStarted,
        );
      };
    }
  }, [sessionRef, idInteraction, onSessionComplete]);

  return { messages };
};

export const LiveAvatarContextProvider = ({
  children,
  sessionAccessToken,
  idInteraction,
  onSessionComplete,
  initialTimerSeconds,
}: LiveAvatarContextProviderProps) => {
  // Default voice chat on
  const config = {
    voiceChat: true,
    apiUrl: API_URL,
  };
  const sessionRef = useRef<LiveAvatarSession>(
    new LiveAvatarSession(sessionAccessToken, config),
  );

  const { sessionState, isStreamReady, connectionQuality } =
    useSessionState(sessionRef);

  const { isMuted, voiceChatState } = useVoiceChatState(sessionRef);
  const { isUserTalking, isAvatarTalking } = useTalkingState(sessionRef);
  const { messages } = useChatHistoryState(
    sessionRef,
    idInteraction,
    onSessionComplete,
  );
  const { timerValue, showTimer } = useTimerState(
    sessionRef,
    initialTimerSeconds,
  );

  return (
    <LiveAvatarContext.Provider
      value={{
        sessionRef,
        sessionState,
        isStreamReady,
        connectionQuality,
        isMuted,
        voiceChatState,
        isUserTalking,
        isAvatarTalking,
        messages,
        timerValue,
        showTimer,
      }}
    >
      {children}
    </LiveAvatarContext.Provider>
  );
};

export const useLiveAvatarContext = () => {
  return useContext(LiveAvatarContext);
};
