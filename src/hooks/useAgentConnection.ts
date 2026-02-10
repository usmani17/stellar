import { useState, useEffect, useCallback } from "react";
import { agentConnectionService } from "../services/ai/agentConnection";

export interface UseAgentConnectionResult {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAgentConnection(): UseAgentConnectionResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const status = await agentConnectionService.checkHealth();
    setIsConnected(status.connected);
    setError(status.error ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { isConnected, isLoading, error, refetch };
}
