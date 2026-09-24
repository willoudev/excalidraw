import { useEffect, useState } from "react";

import { useI18n } from "@excalidraw/excalidraw/i18n";

import { listStoredRooms, type StoredRoom } from "../data/firebase";
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
  const [storedRooms, setStoredRooms] = useState<StoredRoom[] | null>(null);
  const [storedRoomsError, setStoredRoomsError] = useState<string | null>(
    null,
  );
  const [storedRoomsLoading, setStoredRoomsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveRooms().then((rooms) => {
      if (!cancelled) {
        setActiveRooms(rooms);
        setLoading(false);
      }
    });
    listStoredRooms()
      .then((rooms) => {
        if (!cancelled) {
          setStoredRooms(rooms);
          setStoredRoomsLoading(false);
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          setStoredRoomsError(
            error?.code === "permission-denied"
              ? "Accès refusé par les règles de sécurité Firestore (lister la collection entière n'est pas autorisé, seule la lecture par ID connu l'est)."
              : "Impossible de lister les sessions enregistrées.",
          );
          setStoredRoomsLoading(false);
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

      <div className="ActiveSessionsList__section">
        <div className="ActiveSessionsList__header">
          Toutes les sessions enregistrées (Firestore)
        </div>
        <div className="ActiveSessionsList__empty" style={{ marginBottom: 4 }}>
          Le contenu reste chiffré : seuls l'ID et le numéro de version sont
          lisibles sans la clé de chiffrement (dans le lien de la session).
        </div>
        {storedRoomsLoading ? (
          <div className="ActiveSessionsList__loading">
            {t("labels.loadingScene")}
          </div>
        ) : storedRoomsError ? (
          <div className="ActiveSessionsList__error">{storedRoomsError}</div>
        ) : storedRooms && storedRooms.length === 0 ? (
          <div className="ActiveSessionsList__empty">
            Aucune session enregistrée.
          </div>
        ) : (
          <ul className="ActiveSessionsList__list">
            {storedRooms?.map((room) => {
              const known = getSessionHistory().find(
                (entry) => entry.roomId === room.roomId,
              );
              return (
                <li key={room.roomId}>
                  {known ? (
                    <button
                      type="button"
                      className="ActiveSessionsList__item ActiveSessionsList__item--clickable"
                      onClick={() => {
                        window.location.href = known.link;
                      }}
                    >
                      <span className="ActiveSessionsList__item__name">
                        {room.roomId.slice(0, 8)}…
                      </span>
                      <span className="ActiveSessionsList__item__count">
                        v{room.sceneVersion}
                      </span>
                    </button>
                  ) : (
                    <div className="ActiveSessionsList__item">
                      <span className="ActiveSessionsList__item__name">
                        {room.roomId.slice(0, 8)}…
                      </span>
                      <span className="ActiveSessionsList__item__count">
                        v{room.sceneVersion}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
