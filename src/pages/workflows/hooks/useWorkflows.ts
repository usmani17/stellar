import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import {
  workflowsService,
  type Workflow,
  type CreateWorkflowPayload,
  type UpdateWorkflowPayload,
} from "../../../services/workflows";

export const useWorkflows = (
  accountId: number | undefined,
  options?: { search?: string }
) => {
  const queryClient = useQueryClient();
  const search = options?.search?.trim() || undefined;

  const query = useQuery<Workflow[], Error>({
    queryKey: accountId
      ? queryKeys.workflows.lists(accountId, search)
      : ["workflows", "list", "disabled"],
    queryFn: async () => {
      if (!accountId) return [];
      return workflowsService.getWorkflows(accountId, { search });
    },
    enabled: !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkflowPayload) =>
      workflowsService.createWorkflow(payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.all,
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateWorkflowPayload;
    }) =>
      accountId != null
        ? workflowsService.updateWorkflow(accountId, id, payload)
        : Promise.reject(new Error("accountId required")),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.all,
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      accountId != null
        ? workflowsService.deleteWorkflow(accountId, id)
        : Promise.reject(new Error("accountId required")),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.all,
        });
      }
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (workflowId: number) =>
      accountId != null
        ? workflowsService.runWorkflowNow(accountId, workflowId)
        : Promise.reject(new Error("accountId required")),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.all,
        });
      }
    },
  });

  return {
    workflows: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createWorkflow: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateWorkflow: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteWorkflow: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    runWorkflowNow: runNowMutation.mutateAsync,
    isRunning: runNowMutation.isPending,
  };
};
