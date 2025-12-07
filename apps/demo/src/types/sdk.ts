// Tipos temporales mientras se arregla el SDK

// SessionState
export const SessionState = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    INACTIVE: 'inactive'
} as const;
export type SessionState = typeof SessionState[keyof typeof SessionState];

// VoiceChatState
export const VoiceChatState = {
    IDLE: 'idle',
    LISTENING: 'listening',
    SPEAKING: 'speaking',
    PROCESSING: 'processing',
    INACTIVE: 'inactive',
    STARTING: 'starting',
    ACTIVE: 'active'
} as const;
export type VoiceChatState = typeof VoiceChatState[keyof typeof VoiceChatState];

// ConnectionQuality
export const ConnectionQuality = {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    POOR: 'poor',
    DISCONNECTED: 'disconnected',
    UNKNOWN: 'unknown'
} as const;
export type ConnectionQuality = typeof ConnectionQuality[keyof typeof ConnectionQuality];

// Enums
export enum SessionEvent {
    SESSION_STATE_CHANGED = 'session.state_changed',
    SESSION_STREAM_READY = 'session.stream_ready',
    SESSION_CONNECTION_QUALITY_CHANGED = 'session.connection_quality_changed',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    ERROR = 'error'
}

export enum VoiceChatEvent {
    STATE_CHANGED = 'state_changed',
    MUTED = 'muted',
    UNMUTED = 'unmuted',
    START = 'start',
    STOP = 'stop',
    ERROR = 'error'
}

export enum AgentEventsEnum {
    USER_SPEAK_STARTED = 'user.speak_started',
    USER_SPEAK_ENDED = 'user.speak_ended',
    AVATAR_SPEAK_STARTED = 'avatar.speak_started',
    AVATAR_SPEAK_ENDED = 'avatar.speak_ended',
    USER_TRANSCRIPTION = 'user.transcription',
    AVATAR_TRANSCRIPTION = 'avatar.transcription',
    MESSAGE = 'message',
    ERROR = 'error'
}

// LiveAvatarSession Class
export class LiveAvatarSession {
    state: SessionState = SessionState.INACTIVE;
    connectionQuality: ConnectionQuality = ConnectionQuality.UNKNOWN;
    voiceChat = {
        state: VoiceChatState.INACTIVE,
        on: (event: string, callback: any) => { },
        removeAllListeners: () => { },
        mute: async () => { },
        unmute: async () => { },
        start: async () => { },
        stop: () => { }
    };
    constructor(token: string, config: any) { }
    on(event: string, callback: any) { }
    off(event: string, callback: any) { }
    removeAllListeners() { }
    start() { }
    stop() { }
    attach(element: HTMLMediaElement) { }
    keepAlive() { }
    message(text: string) { }
    repeatAudio(audio: string) { }
}
