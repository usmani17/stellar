import { useQuery } from "@tanstack/react-query";
import { workflowsService, type WorkflowRun } from "../../../services/workflows";
import { queryKeys } from "../../../hooks/queries/queryKeys";

export const useWorkflowRuns = (workflowId: number | undefined) => {
  return useQuery<WorkflowRun[]>({
    queryKey: queryKeys.workflows.runs(workflowId ?? 0),
    queryFn: () =>
      workflowId
        ? workflowsService.getWorkflowRuns(workflowId)
        : Promise.resolve([]),
    enabled: !!workflowId,
  });
};
