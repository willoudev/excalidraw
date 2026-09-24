const STORAGE_KEY = "whiteboard-session-history";
const MAX_ENTRIES = 20;

export type SessionHistoryEntry = {
  roomId: string;
  link: string;
  savedAt: number;
};

const parseRoomId = (link: string): string | null => {
  try {
    const hash = new URL(link).hash; // "#room=<roomId>,<key>"
    const match = hash.match(/^#room=([^,]+),/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const getSessionHistory = (): SessionHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Remembers a collaboration room link locally so it can later be listed
 * among "my active sessions" if the room is still active on the server. */
export const recordSessionLink = (link: string): void => {
  const roomId = parseRoomId(link);
  if (!roomId) {
    return;
  }
  const history = getSessionHistory().filter((entry) => entry.roomId !== roomId);
  history.unshift({ roomId, link, savedAt: Date.now() });
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(history.slice(0, MAX_ENTRIES)),
    );
  } catch {
    // ignore quota errors
  }
};
