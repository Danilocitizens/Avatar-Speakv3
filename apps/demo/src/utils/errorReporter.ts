import { fetchWithTimeout } from "./fetchWithTimeout";

const WEBHOOK_URL = "https://devwebhook.inteliventa.ai/webhook/liveavatar";

type ErrorCategory = "connection" | "api" | "webhook" | "session" | "media";

export interface ErrorReport {
  type: "ERROR_REPORT";
  error_code: string;
  error_message: string;
  error_category: ErrorCategory;
  http_status?: number | null;
  id_interaccion: string;
  session_duration_seconds?: number | null;
  user_agent: string;
  timestamp: string;
  context?: string;
}

export function buildErrorReport(
  code: string,
  message: string,
  category: ErrorCategory,
  idInteraction: string,
  extra?: {
    httpStatus?: number | null;
    sessionDuration?: number | null;
    context?: string;
  },
): ErrorReport {
  return {
    type: "ERROR_REPORT",
    error_code: code,
    error_message: message,
    error_category: category,
    http_status: extra?.httpStatus ?? null,
    id_interaccion: idInteraction,
    session_duration_seconds: extra?.sessionDuration ?? null,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    timestamp: new Date().toISOString(),
    context: extra?.context,
  };
}

export async function reportErrorToWebhook(report: ErrorReport): Promise<void> {
  try {
    await fetchWithTimeout(
      WEBHOOK_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      },
      5000,
    );
  } catch {
    console.error("[ErrorReporter] Failed to send error report");
  }
}
