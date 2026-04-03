import React, { useEffect, useState } from "react";
import { getPortfolioActions } from "../../../services/dashboard";
import type { PortfolioAction } from "../../../services/dashboard";
import { ActionsListPanel } from "../../../components/actions/ActionsListPanel";
import type { ActionItem } from "../../../components/actions/ActionsListPanel";

interface Props {
  accountId: number;
  portfolioId: number;
}

function toActionItems(actions: PortfolioAction[]): ActionItem[] {
  return actions.map((a) => ({
    id: a.id,
    action_slug: a.action_slug,
    action_id: a.action_id,
    dashboard_id: a.dashboard_id,
    dashboard_name: a.dashboard_name,
    component_id: a.component_id,
    type: a.type,
    platform: a.platform,
    entity_type: a.entity_type,
    status: a.status,
    description: a.description,
    condition: a.condition,
    params: a.params,
    guardrails: a.guardrails,
    schedule: a.schedule,
  }));
}

export const PortfolioActionsTab: React.FC<Props> = ({ accountId, portfolioId }) => {
  const [actions, setActions] = useState<PortfolioAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getPortfolioActions(accountId, portfolioId);
      setActions(data);
    } catch {
      if (!isRefresh) setActions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchActions().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, portfolioId]);

  return (
    <ActionsListPanel
      actions={toActionItems(actions)}
      accountId={accountId}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchActions(true)}
      groupBy="dashboard"
      showDashboardLink
      onActionStatusChange={() => fetchActions(true)}
    />
  );
};
