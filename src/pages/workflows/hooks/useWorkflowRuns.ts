import { useQuery } from "@tanstack/react-query";
import { workflowsService, type WorkflowRun } from "../../../services/workflows";
import { queryKeys } from "../../../hooks/queries/queryKeys";

export const useWorkflowRuns = (
  accountId: number | undefined,
  workflowId: number | undefined
) => {
  return useQuery<WorkflowRun[]>({
    queryKey: queryKeys.workflows.runs(workflowId ?? 0),
    queryFn: () =>
      accountId != null && workflowId
        ? workflowsService.getWorkflowRuns(accountId, workflowId)
        : Promise.resolve([]),
    enabled: !!accountId && !!workflowId,
    refetchOnMount: "always", // Ensure fresh runs (with cur_sessions_id) when modal opens
  });
};
