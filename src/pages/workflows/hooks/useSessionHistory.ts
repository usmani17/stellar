import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { pixisAiSessionsService } from "../../../services/ai/pixisAiSessions";

export const useSessionHistory = (sessionId: string | undefined, enabled: boolean) => {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: ["session-history", sessionId],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !sessionId) throw new Error("Missing token or sessionId");
      const res = await pixisAiSessionsService.getHistory(sessionId, token);
      return res.history;
    },
    enabled: !!sessionId && enabled,
    refetchOnMount: "always",
  });
};
