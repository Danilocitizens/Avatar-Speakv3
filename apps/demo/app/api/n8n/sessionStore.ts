/**
 * In-memory session store for modo_n8n.
 *
 * n8n writes a session_token via POST /api/n8n/provide-session,
 * and the frontend polls GET /api/n8n/poll-session to retrieve it.
 *
 * Tokens auto-expire after TTL_MS to prevent memory leaks.
 */

export interface PendingSession {
  session_token: string;
  inicio_seg?: string;
  timestamp: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map<string, PendingSession>();

/**
 * Store a session token for a given interaction ID.
 * Overwrites any previous entry for the same ID.
 */
export function setSession(
  idInteraccion: string,
  data: Omit<PendingSession, "timestamp">,
): void {
  // Cleanup expired entries opportunistically
  cleanup();

  store.set(idInteraccion, {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Retrieve and remove a session token for a given interaction ID.
 * Returns null if not found or expired.
 */
export function consumeSession(idInteraccion: string): PendingSession | null {
  const entry = store.get(idInteraccion);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(idInteraccion);
    return null;
  }

  // Remove after consumption (one-time use)
  store.delete(idInteraccion);
  return entry;
}

/**
 * Check if a session is pending (without consuming it).
 */
export function hasSession(idInteraccion: string): boolean {
  const entry = store.get(idInteraccion);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(idInteraccion);
    return false;
  }
  return true;
}

/**
 * Remove expired entries from the store.
 */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.timestamp > TTL_MS) {
      store.delete(key);
    }
  }
}
