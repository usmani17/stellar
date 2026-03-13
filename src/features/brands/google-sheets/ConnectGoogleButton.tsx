import React from "react";
import { Button } from "../../../components/ui";
import { getGoogleSheetsConnectUrl } from "./api";

interface Props {
  accountId: number;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export const ConnectGoogleButton: React.FC<Props> = ({
  accountId,
  disabled,
  onError,
}) => {
  const handleClick = async () => {
    try {
      const url = await getGoogleSheetsConnectUrl(accountId);
      window.location.href = url;
    } catch (e: any) {
      if (onError) {
        onError(
          e?.response?.data?.detail ||
            "Failed to initiate Google Sheets connection.",
        );
      }
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled}>
      Connect Google Sheets
    </Button>
  );
};

export default ConnectGoogleButton;

