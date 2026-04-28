export const API_KEY = process.env.HEYGEN_API_KEY || "";
export const API_URL = process.env.HEYGEN_API_URL || "";
export const AVATAR_ID = process.env.HEYGEN_AVATAR_ID || "";

// FULL MODE Customizations
// Wayne's avatar voice and context
export const VOICE_ID = process.env.HEYGEN_VOICE_ID || "";
// export const CONTEXT_ID = "";
export const LANGUAGE = process.env.HEYGEN_LANGUAGE || "";

// CUSTOM MODE Customizations
// export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
// export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ElevenLabs voice settings (used when proveedor === "elevenlabs")
export const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";
export const ELEVENLABS_SPEED = Number(process.env.ELEVENLABS_SPEED ?? 1);
export const ELEVENLABS_STABILITY = Number(
  process.env.ELEVENLABS_STABILITY ?? 0.75,
);
export const ELEVENLABS_SIMILARITY_BOOST = Number(
  process.env.ELEVENLABS_SIMILARITY_BOOST ?? 0.75,
);
export const ELEVENLABS_STYLE = Number(process.env.ELEVENLABS_STYLE ?? 0);
export const ELEVENLABS_USE_SPEAKER_BOOST =
  (process.env.ELEVENLABS_USE_SPEAKER_BOOST ?? "true").toLowerCase() === "true";
