import { trackEvent } from "@excalidraw/excalidraw/analytics";
import { copyTextToSystemClipboard } from "@excalidraw/excalidraw/clipboard";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import {
  copyIcon,
  playerPlayIcon,
  playerStopFilledIcon,
  share,
  shareIOS,
  shareWindows,
} from "@excalidraw/excalidraw/components/icons";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { useCopyStatus } from "@excalidraw/excalidraw/hooks/useCopiedIndicator";
import { useI18n } from "@excalidraw/excalidraw/i18n";
import { KEYS, getFrame } from "@excalidraw/common";
import { useEffect, useRef, useState } from "react";

import { atom, useAtom, useAtomValue } from "../app-jotai";
import { activeRoomInfoAtom, activeRoomLinkAtom } from "../collab/Collab";
import { getCollaborationLinkData } from "../data";

import { ActiveSessionsList } from "./ActiveSessionsList";

import "./ShareDialog.scss";
import { QRCode } from "./QRCode";

import type { CollabAPI } from "../collab/Collab";

type ShareDialogType = "share" | "collaborationOnly";

export const shareDialogStateAtom = atom<
  { isOpen: false } | { isOpen: true; type: ShareDialogType }
>({ isOpen: false });

const getShareIcon = () => {
  const navigator = window.navigator as any;
  const isAppleBrowser = /Apple/.test(navigator.vendor);
  const isWindowsBrowser = navigator.appVersion.indexOf("Win") !== -1;

  if (isAppleBrowser) {
    return shareIOS;
  } else if (isWindowsBrowser) {
    return shareWindows;
  }

  return share;
};

export type ShareDialogProps = {
  collabAPI: CollabAPI | null;
  handleClose: () => void;
  type: ShareDialogType;
};

const ActiveRoomDialog = ({
  collabAPI,
  activeRoomLink,
  handleClose,
}: {
  collabAPI: CollabAPI;
  activeRoomLink: string;
  handleClose: () => void;
}) => {
  const { t } = useI18n();
  const [, setJustCopied] = useState(false);
  const timerRef = useRef<number>(0);
  const ref = useRef<HTMLInputElement>(null);
  const isShareSupported = "share" in navigator;
  const { onCopy, copyStatus } = useCopyStatus();
  const roomInfo = useAtomValue(activeRoomInfoAtom);

  const copyRoomLink = async () => {
    try {
      await copyTextToSystemClipboard(activeRoomLink);
    } catch (e) {
      collabAPI.setCollabError(t("errors.copyToSystemClipboardFailed"));
    }

    setJustCopied(true);

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setJustCopied(false);
    }, 3000);

    ref.current?.select();
  };

  const shareRoomLink = async () => {
    try {
      await navigator.share({
        title: t("roomDialog.shareTitle"),
        text: t("roomDialog.shareTitle"),
        url: activeRoomLink,
      });
    } catch (error: any) {
      // Just ignore.
    }
  };

  return (
    <>
      <h3 className="ShareDialog__active__header">
        {roomInfo
          ? roomInfo.name
          : t("labels.liveCollaboration").replace(/\./g, "")}
      </h3>
      {roomInfo && (
        <div className="ShareDialog__active__creator">
          Créée par {roomInfo.creatorName}
        </div>
      )}
      <TextField
        defaultValue={collabAPI.getUsername()}
        placeholder="Your name"
        label="Your name"
        onChange={collabAPI.setUsername}
        onKeyDown={(event) => event.key === KEYS.ENTER && handleClose()}
      />
      <div className="ShareDialog__active__linkRow">
        <TextField
          ref={ref}
          label="Link"
          readonly
          fullWidth
          value={activeRoomLink}
        />
        {isShareSupported && (
          <FilledButton
            size="large"
            variant="icon"
            label="Share"
            icon={getShareIcon()}
            className="ShareDialog__active__share"
            onClick={shareRoomLink}
          />
        )}
        <FilledButton
          size="large"
          label={t("buttons.copyLink")}
          icon={copyIcon}
          status={copyStatus}
          onClick={() => {
            copyRoomLink();
            onCopy();
          }}
        />
      </div>
      <QRCode value={activeRoomLink} />
      <div className="ShareDialog__active__description">
        <p>
          <span
            role="img"
            aria-hidden="true"
            className="ShareDialog__active__description__emoji"
          >
            🔒{" "}
          </span>
          {t("roomDialog.desc_privacy")}
        </p>
        <p>{t("roomDialog.desc_exitSession")}</p>
        <p>
          "Fermer pour tout le monde" met en revanche fin à la session pour
          tous les participants connectés.
        </p>
      </div>

      <div
        className="ShareDialog__active__actions"
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <FilledButton
          size="large"
          variant="outlined"
          label="Sortir"
          onClick={() => {
            trackEvent("share", "room left");
            collabAPI.stopCollaboration(false);
            if (!collabAPI.isCollaborating()) {
              handleClose();
            }
          }}
        />
        <FilledButton
          size="large"
          variant="outlined"
          color="danger"
          label="Fermer pour tout le monde"
          icon={playerStopFilledIcon}
          onClick={() => {
            trackEvent("share", "room closed for everyone");
            collabAPI.closeRoomForEveryone();
            handleClose();
          }}
        />
      </div>
    </>
  );
};

const ShareDialogPicker = (props: ShareDialogProps) => {
  const { t } = useI18n();

  const { collabAPI } = props;

  const [mode, setMode] = useState<"idle" | "starting" | "joining">("idle");
  const [roomNameInput, setRoomNameInput] = useState("");
  const [creatorNameInput, setCreatorNameInput] = useState(
    () => collabAPI?.getUsername() ?? "",
  );
  const [joinLinkInput, setJoinLinkInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // "rooms actives" (server-wide, other people's sessions) stays hidden
  // unless MAJ (Shift) + 9 is pressed three times in a row while this
  // dialog is open — resets to hidden every time the dialog is reopened,
  // since this component remounts fresh then
  const [showActiveSessions, setShowActiveSessions] = useState(false);
  const shiftNineCountRef = useRef(0);
  const lastShiftNineRef = useRef(0);

  useEffect(() => {
    if (props.type !== "share" || showActiveSessions) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.shiftKey && event.code === "Digit9")) {
        return;
      }
      const now = Date.now();
      if (now - lastShiftNineRef.current > 1500) {
        shiftNineCountRef.current = 0;
      }
      lastShiftNineRef.current = now;
      shiftNineCountRef.current += 1;
      if (shiftNineCountRef.current >= 3) {
        setShowActiveSessions(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.type, showActiveSessions]);

  if (!collabAPI) {
    return null;
  }

  const handleStart = () => {
    trackEvent("share", "room creation", `ui (${getFrame()})`);
    if (creatorNameInput.trim()) {
      collabAPI.setUsername(creatorNameInput);
    }
    collabAPI.startCollaboration(null, {
      roomName: roomNameInput,
      creatorName: creatorNameInput,
    });
  };

  const handleJoin = () => {
    const link = joinLinkInput.trim();
    if (!link) {
      return;
    }
    try {
      const data = getCollaborationLinkData(link);
      if (!data) {
        setJoinError("Ce lien ne contient pas de session de collaboration.");
        return;
      }
      window.location.href = link;
    } catch {
      setJoinError("Lien invalide.");
    }
  };

  return (
    <>
      <div className="ShareDialog__picker__header">
        {t("labels.liveCollaboration").replace(/\./g, "")}
      </div>

      <div className="ShareDialog__picker__description">
        <div style={{ marginBottom: "1em" }}>{t("roomDialog.desc_intro")}</div>
        {t("roomDialog.desc_privacy")}
      </div>

      <div
        className="ShareDialog__picker__button"
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
      >
        <FilledButton
          size="large"
          label="Démarrer une session"
          icon={playerPlayIcon}
          onClick={() =>
            setMode((current) => (current === "starting" ? "idle" : "starting"))
          }
        />
        <FilledButton
          size="large"
          variant="outlined"
          label="Se connecter à une session en cours"
          onClick={() =>
            setMode((current) => (current === "joining" ? "idle" : "joining"))
          }
        />
      </div>

      {mode === "starting" && (
        <div
          className="ShareDialog__picker__form"
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <TextField
            label="Nom de la session"
            placeholder="Ex : Réunion équipe produit"
            value={roomNameInput}
            onChange={setRoomNameInput}
            onKeyDown={(event) => event.key === KEYS.ENTER && handleStart()}
          />
          <TextField
            label="Votre nom"
            placeholder="Votre nom"
            value={creatorNameInput}
            onChange={setCreatorNameInput}
            onKeyDown={(event) => event.key === KEYS.ENTER && handleStart()}
          />
          <FilledButton
            size="large"
            label="Démarrer"
            icon={playerPlayIcon}
            onClick={handleStart}
          />
        </div>
      )}

      {mode === "joining" && (
        <div
          className="ShareDialog__picker__form"
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <TextField
            label="Lien de la session"
            placeholder="Collez le lien d'invitation reçu"
            value={joinLinkInput}
            onChange={(value) => {
              setJoinLinkInput(value);
              setJoinError(null);
            }}
            onKeyDown={(event) => event.key === KEYS.ENTER && handleJoin()}
          />
          {joinError && (
            <div className="ShareDialog__picker__error">{joinError}</div>
          )}
          <FilledButton size="large" label="Rejoindre" onClick={handleJoin} />
        </div>
      )}

      {showActiveSessions && (
        <>
          <div className="ShareDialog__separator">
            <span>{t("shareDialog.or")}</span>
          </div>
          <ActiveSessionsList />
        </>
      )}
    </>
  );
};

const ShareDialogInner = (props: ShareDialogProps) => {
  const activeRoomLink = useAtomValue(activeRoomLinkAtom);

  return (
    <Dialog size="small" onCloseRequest={props.handleClose} title={false}>
      <div className="ShareDialog">
        {props.collabAPI && activeRoomLink ? (
          <ActiveRoomDialog
            collabAPI={props.collabAPI}
            activeRoomLink={activeRoomLink}
            handleClose={props.handleClose}
          />
        ) : (
          <ShareDialogPicker {...props} />
        )}
      </div>
    </Dialog>
  );
};

export const ShareDialog = (props: { collabAPI: CollabAPI | null }) => {
  const [shareDialogState, setShareDialogState] = useAtom(shareDialogStateAtom);

  const { openDialog } = useUIAppState();

  useEffect(() => {
    if (openDialog) {
      setShareDialogState({ isOpen: false });
    }
  }, [openDialog, setShareDialogState]);

  if (!shareDialogState.isOpen) {
    return null;
  }

  return (
    <ShareDialogInner
      handleClose={() => setShareDialogState({ isOpen: false })}
      collabAPI={props.collabAPI}
      type={shareDialogState.type}
    />
  );
};
