import { useEffect, useState } from "react";

import { useI18n } from "@excalidraw/excalidraw/i18n";

import {
  getSessionHistory,
  type SessionHistoryEntry,
} from "../data/SessionHistory";

import "./ActiveSessionsList.scss";

type ActiveRoom = { roomId: string; count: number };

const fetchActiveRooms = async (): Promise<ActiveRoom[] | null> => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_APP_WS_SERVER_URL}/rooms`,
    );
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch {
    return null;
  }
};

export const ActiveSessionsList = () => {
  const { t } = useI18n();
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveRooms().then((rooms) => {
      if (!cancelled) {
        setActiveRooms(rooms);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="ActiveSessionsList__loading">
        {t("labels.loadingScene")}
      </div>
    );
  }

  if (activeRooms === null) {
    return (
      <div className="ActiveSessionsList__error">
        Impossible de contacter le serveur de collaboration.
      </div>
    );
  }

  const activeRoomIds = new Set(activeRooms.map((room) => room.roomId));
  const myActiveSessions: SessionHistoryEntry[] = getSessionHistory().filter(
    (entry) => activeRoomIds.has(entry.roomId),
  );

  return (
    <div className="ActiveSessionsList">
      <div className="ActiveSessionsList__section">
        <div className="ActiveSessionsList__header">Mes sessions actives</div>
        {myActiveSessions.length === 0 ? (
          <div className="ActiveSessionsList__empty">
            Aucune de tes sessions récentes n'est active en ce moment.
          </div>
        ) : (
          <ul className="ActiveSessionsList__list">
            {myActiveSessions.map((entry) => {
              const room = activeRooms.find((r) => r.roomId === entry.roomId);
              return (
                <li key={entry.roomId}>
                  <button
                    type="button"
                    className="ActiveSessionsList__item ActiveSessionsList__item--clickable"
                    onClick={() => {
                      window.location.href = entry.link;
                    }}
                  >
                    <span className="ActiveSessionsList__item__name">
                      {entry.roomId.slice(0, 8)}…
                    </span>
                    <span className="ActiveSessionsList__item__count">
                      {room?.count ?? 0} participant
                      {(room?.count ?? 0) > 1 ? "s" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="ActiveSessionsList__section">
        <div className="ActiveSessionsList__header">
          Toutes les sessions actives sur le serveur
        </div>
        {activeRooms.length === 0 ? (
          <div className="ActiveSessionsList__empty">
            Aucune session active pour le moment.
          </div>
        ) : (
          <ul className="ActiveSessionsList__list">
            {activeRooms.map((room) => (
              <li key={room.roomId}>
                <div className="ActiveSessionsList__item">
                  <span className="ActiveSessionsList__item__name">
                    {room.roomId.slice(0, 8)}…
                  </span>
                  <span className="ActiveSessionsList__item__count">
                    {room.count} participant{room.count > 1 ? "s" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
