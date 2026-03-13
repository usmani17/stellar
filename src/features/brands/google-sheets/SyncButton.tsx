import React from "react";
import { Button } from "../../../components/ui";

interface Props {
  syncing: boolean;
  onClick: () => void;
}

export const SyncButton: React.FC<Props> = ({ syncing, onClick }) => {
  return (
    <Button onClick={onClick} disabled={syncing}>
      {syncing ? "Syncing..." : "Manual Sync"}
    </Button>
  );
};

export default SyncButton;

