import { getCollaborationLink } from "./index";

export type ActiveRoom = {
  roomId: string;
  count: number;
  name: string | null;
  creatorName: string | null;
};

/** Never includes the E2E key or any access code — see excalidraw-room's
 * GET /rooms. Joining a listed room still needs either the invite link
 * or a verified access code (see verifyAccessCode below). */
export const fetchActiveRooms = async (): Promise<ActiveRoom[] | null> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_APP_WS_SERVER_URL}/rooms`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch {
    return null;
  }
};

/** Checks a room's access code against the server over a throwaway
 * socket connection (closed as soon as we get an answer). On success,
 * the server hands back the room's E2E key so we can build the same
 * kind of link a direct invite would have given us — the caller then
 * joins through the normal link-opening flow, nothing special about
 * this connection sticks around. */
export const verifyAccessCode = (
  roomId: string,
  code: string,
): Promise<{ success: true; link: string } | { success: false }> => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { success: true; link: string } | { success: false }) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      socket?.close();
      resolve(result);
    };

    let socket: import("socket.io-client").Socket | null = null;

    const timeoutId = window.setTimeout(() => finish({ success: false }), 8000);

    import("socket.io-client").then(({ default: socketIOClient }) => {
      if (settled) {
        return;
      }
      socket = socketIOClient(import.meta.env.VITE_APP_WS_SERVER_URL, {
        transports: ["websocket", "polling"],
      });
      socket.on("connect_error", () => finish({ success: false }));
      socket.on("access-code-invalid", () => finish({ success: false }));
      socket.on("access-code-verified", (data: { roomKey: string }) => {
        finish({
          success: true,
          link: getCollaborationLink({ roomId, roomKey: data.roomKey }),
        });
      });
      socket.emit("join-with-code", { roomID: roomId, code });
    });
  });
};
