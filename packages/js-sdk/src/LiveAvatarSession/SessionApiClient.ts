import { API_URL } from "../const";
import { SessionInfo } from "./types";

const DEFAULT_ERROR_CODE = 500;
const SUCCESS_CODE = 1000;

class SessionApiError extends Error {
  errorCode: number;
  status: number | null = null;
  rawBody: string | null = null;

  constructor(
    message: string,
    errorCode?: number,
    status?: number,
    rawBody?: string,
  ) {
    super(message);
    this.errorCode = errorCode ?? DEFAULT_ERROR_CODE;
    this.status = status ?? null;
    this.rawBody = rawBody ?? null;
  }
}

export class SessionAPIClient {
  private readonly sessionToken: string;
  private readonly apiUrl: string;

  constructor(sessionToken: string, apiUrl: string = API_URL) {
    this.sessionToken = sessionToken;
    this.apiUrl = apiUrl && apiUrl !== "" ? apiUrl : API_URL;
  }

  private async request<T = any>(
    path: string,
    params: RequestInit,
  ): Promise<T> {
    const fullUrl = `${this.apiUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(fullUrl, {
        ...params,
        headers: {
          Authorization: `Bearer ${this.sessionToken}`,
          "Content-Type": "application/json",
          ...params.headers,
        },
      });
    } catch (networkErr) {
      console.error("[SessionApiClient] Network error:", {
        url: fullUrl,
        error: networkErr,
      });
      throw new SessionApiError(
        networkErr instanceof Error
          ? `Network error: ${networkErr.message}`
          : "Network error",
      );
    }

    const rawBody = await response.text();
    let parsedBody: any = null;
    let parseError: Error | null = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (e) {
        parseError = e as Error;
      }
    }

    const headerSnapshot = {
      "content-type": response.headers.get("content-type"),
      "x-request-id": response.headers.get("x-request-id"),
      "x-trace-id": response.headers.get("x-trace-id"),
    };

    if (!response.ok) {
      console.error("[SessionApiClient] API Error:", {
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
        headers: headerSnapshot,
        rawBody,
        parsedBody,
        parseError: parseError?.message ?? null,
      });
      throw new SessionApiError(
        parsedBody?.data?.message ||
          parsedBody?.message ||
          (rawBody && rawBody.length < 500 ? rawBody : null) ||
          `API request failed with status ${response.status}`,
        parsedBody?.code,
        response.status,
        rawBody,
      );
    }

    if (parseError) {
      console.error("[SessionApiClient] Invalid JSON in success response:", {
        url: fullUrl,
        headers: headerSnapshot,
        rawBody,
        parseError: parseError.message,
      });
      throw new SessionApiError(
        `Invalid JSON in 2xx response: ${parseError.message}`,
        undefined,
        response.status,
        rawBody,
      );
    }

    if (parsedBody?.code !== SUCCESS_CODE) {
      console.error("[SessionApiClient] Non-success code in 2xx response:", {
        url: fullUrl,
        status: response.status,
        headers: headerSnapshot,
        parsedBody,
      });
      throw new SessionApiError(
        parsedBody?.data?.message || "API request failed",
        parsedBody?.code,
        response.status,
        rawBody,
      );
    }

    return parsedBody.data as T;
  }

  public async startSession(): Promise<SessionInfo> {
    return await this.request(`/v1/sessions/start`, { method: "POST" });
  }

  public async stopSession(): Promise<void> {
    return await this.request(`/v1/sessions/stop`, { method: "POST" });
  }

  public async keepAlive(): Promise<void> {
    return await this.request(`/v1/sessions/keep-alive`, { method: "POST" });
  }
}
