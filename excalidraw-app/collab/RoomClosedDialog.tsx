import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";

export const RoomClosedDialog = ({ onClose }: { onClose: () => void }) => {
  return (
    <Dialog size="small" onCloseRequest={onClose} title="Session partagée fermée">
      <p>
        Ce lien de collaboration n'est plus valide : la session a été fermée
        par son créateur, ou n'a jamais existé.
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <FilledButton size="large" label="Fermer" onClick={onClose} />
      </div>
    </Dialog>
  );
};
