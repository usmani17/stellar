import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import {
  workflowsService,
  type Workflow,
  type CreateWorkflowPayload,
  type UpdateWorkflowPayload,
} from "../../../services/workflows";

export const useWorkflows = (accountId: number | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery<Workflow[], Error>({
    queryKey: accountId
      ? queryKeys.workflows.lists(accountId)
      : ["workflows", "list", "disabled"],
    queryFn: async () => {
      if (!accountId) return [];
      return workflowsService.getWorkflows(accountId);
    },
    enabled: !!accountId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateWorkflowPayload) =>
      workflowsService.createWorkflow(payload),
    onSuccess: () => {
      if (accountId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflows.lists(accountId),
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
          queryKey: queryKeys.workflows.lists(accountId),
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
          queryKey: queryKeys.workflows.lists(accountId),
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
  };
};
