import type { DashboardComponent } from "../types/dashboard";

/**
 * Generate mock data for dashboard components (MVP — no API)
 * Supports all query types: gaql, multi_gaql, sql
 */
export function getMockDataForComponent(
  component: DashboardComponent
): Record<string, unknown>[] {
  const id = component.id;
  const vizType = component.visualization_type;

  if (vizType === "bar_chart") {
    return getMockBarChartData(id);
  }

  if (vizType === "line_chart") {
    return getMockLineChartData(id);
  }

  if (vizType === "pie_chart") {
    return getMockPieChartData(id);
  }

  if (vizType === "area_chart") {
    return getMockAreaChartData(id);
  }

  if (vizType === "combo_chart") {
    return getMockComboChartData(id);
  }

  if (vizType === "comparison_chart") {
    return getMockComparisonChartData(id);
  }

  if (vizType === "single_metric") {
    return getMockSingleMetricData(id);
  }

  if (vizType === "stacked_bar_chart") {
    return getMockStackedBarData(component);
  }

  if (vizType === "donut_chart") {
    return getMockPieChartData(id);
  }

  if (vizType === "funnel_chart") {
    return getMockFunnelData();
  }

  if (vizType === "scatter_plot") {
    return getMockScatterData(component);
  }

  if (vizType === "gauge_chart") {
    return getMockGaugeData();
  }

  if (vizType === "horizontal_bar_chart") {
    return getMockHorizontalBarData(component);
  }

  switch (id) {
    case "campaign-perf":
    case "campaign-perf-date-range":
      return [
        {
          "campaign.id": 101,
          "campaign.name": "Summer Sale",
          "segments.date": "2025-03-01",
          "metrics.impressions": 125000,
          "metrics.clicks": 3400,
          "metrics.cost_micros": 892000000,
          "metrics.conversions": 120,
        },
        {
          "campaign.id": 102,
          "campaign.name": "Athletic",
          "segments.date": "2025-03-01",
          "metrics.impressions": 98000,
          "metrics.clicks": 2100,
          "metrics.cost_micros": 654000000,
          "metrics.conversions": 80,
        },
        {
          "campaign.id": 103,
          "campaign.name": "Winter 2024",
          "segments.date": "2025-03-01",
          "metrics.impressions": 72000,
          "metrics.clicks": 1800,
          "metrics.cost_micros": 421000000,
          "metrics.conversions": 60,
        },
        {
          "campaign.id": 104,
          "campaign.name": "Everyday",
          "segments.date": "2025-03-01",
          "metrics.impressions": 56000,
          "metrics.clicks": 950,
          "metrics.cost_micros": 312000000,
          "metrics.conversions": 40,
        },
        {
          "campaign.id": 105,
          "campaign.name": "Brand Awareness",
          "segments.date": "2025-03-01",
          "metrics.impressions": 42000,
          "metrics.clicks": 720,
          "metrics.cost_micros": 198000000,
          "metrics.conversions": 30,
        },
      ];
    case "campaign-keyword-summary":
      return [
        {
          "campaigns.campaign.name": "Summer Sale",
          "campaigns.campaign.id": 101,
          total_impressions: 125000,
          total_clicks: 3400,
          total_cost_micros: 892000000,
          keyword_clicks: 2100,
          campaign_count: 1,
        },
        {
          "campaigns.campaign.name": "Athletic",
          "campaigns.campaign.id": 102,
          total_impressions: 98000,
          total_clicks: 2100,
          total_cost_micros: 654000000,
          keyword_clicks: 1800,
          campaign_count: 1,
        },
        {
          "campaigns.campaign.name": "Winter 2024",
          "campaigns.campaign.id": 103,
          total_impressions: 72000,
          total_clicks: 1800,
          total_cost_micros: 421000000,
          keyword_clicks: 1200,
          campaign_count: 1,
        },
        {
          "campaigns.campaign.name": "Everyday",
          "campaigns.campaign.id": 104,
          total_impressions: 56000,
          total_clicks: 950,
          total_cost_micros: 312000000,
          keyword_clicks: 650,
          campaign_count: 1,
        },
      ];
    case "workflow-runs":
      return [
        {
          id: 1,
          workflow_id: 52,
          ran_at: "2025-03-04T10:30:00Z",
          status: "completed",
          output_url: "https://storage.example.com/run-1.csv",
        },
        {
          id: 2,
          workflow_id: 52,
          ran_at: "2025-03-04T09:15:00Z",
          status: "completed",
          output_url: "https://storage.example.com/run-2.csv",
        },
        {
          id: 3,
          workflow_id: 51,
          ran_at: "2025-03-03T14:22:00Z",
          status: "failed",
          output_url: null,
        },
        {
          id: 4,
          workflow_id: 52,
          ran_at: "2025-03-03T08:00:00Z",
          status: "completed",
          output_url: "https://storage.example.com/run-4.csv",
        },
        {
          id: 5,
          workflow_id: 50,
          ran_at: "2025-03-02T16:45:00Z",
          status: "completed",
          output_url: "https://storage.example.com/run-5.csv",
        },
      ];
    case "top-keywords":
      return [
        {
          keyword: "brand shoes",
          match_type: "BROAD",
          campaign: "Summer Sale",
          impressions: 12500,
          clicks: 340,
          spend: 892,
          conversions: 12,
          conversions_value: 480,
        },
        {
          keyword: "running sneakers",
          match_type: "PHRASE",
          campaign: "Athletic",
          impressions: 9800,
          clicks: 210,
          spend: 654,
          conversions: 8,
          conversions_value: 320,
        },
        {
          keyword: "comfort sandals",
          match_type: "EXACT",
          campaign: "Summer Sale",
          impressions: 7200,
          clicks: 180,
          spend: 421,
          conversions: 6,
          conversions_value: 240,
        },
        {
          keyword: "winter boots",
          match_type: "BROAD",
          campaign: "Winter 2024",
          impressions: 5600,
          clicks: 95,
          spend: 312,
          conversions: 4,
          conversions_value: 160,
        },
        {
          keyword: "casual loafers",
          match_type: "PHRASE",
          campaign: "Everyday",
          impressions: 4200,
          clicks: 72,
          spend: 198,
          conversions: 3,
          conversions_value: 120,
        },
      ];
    case "search-terms":
      return [
        {
          search_term: "buy running shoes online",
          status: "ENABLED",
          campaign: "Athletic",
          ad_group: "Running",
          impressions: 4500,
          clicks: 89,
          spend: 234,
          conversions: 5,
        },
        {
          search_term: "best sandals for summer",
          status: "ENABLED",
          campaign: "Summer Sale",
          ad_group: "Sandals",
          impressions: 3200,
          clicks: 67,
          spend: 178,
          conversions: 3,
        },
        {
          search_term: "comfortable work shoes",
          status: "ENABLED",
          campaign: "Everyday",
          ad_group: "Loafers",
          impressions: 2800,
          clicks: 54,
          spend: 145,
          conversions: 2,
        },
        {
          search_term: "waterproof winter boots",
          status: "ENABLED",
          campaign: "Winter 2024",
          ad_group: "Boots",
          impressions: 2100,
          clicks: 41,
          spend: 112,
          conversions: 2,
        },
        {
          search_term: "discount athletic footwear",
          status: "ENABLED",
          campaign: "Athletic",
          ad_group: "Sneakers",
          impressions: 1800,
          clicks: 38,
          spend: 98,
          conversions: 1,
        },
      ];
    case "keyword-quality-score":
      return [
        {
          keyword: "brand shoes",
          match_type: "EXACT",
          campaign: "Summer Sale",
          ad_group: "Branded",
          quality_score: 9,
        },
        {
          keyword: "running sneakers",
          match_type: "PHRASE",
          campaign: "Athletic",
          ad_group: "Running",
          quality_score: 8,
        },
        {
          keyword: "comfort sandals",
          match_type: "EXACT",
          campaign: "Summer Sale",
          ad_group: "Sandals",
          quality_score: 8,
        },
        {
          keyword: "winter boots",
          match_type: "BROAD",
          campaign: "Winter 2024",
          ad_group: "Boots",
          quality_score: 7,
        },
        {
          keyword: "casual loafers",
          match_type: "PHRASE",
          campaign: "Everyday",
          ad_group: "Loafers",
          quality_score: 7,
        },
      ];
    default:
      return [
        { col1: "Sample 1", col2: 100, col3: 200 },
        { col1: "Sample 2", col2: 150, col3: 250 },
      ];
  }
}

function getMockBarChartData(componentId: string): Record<string, unknown>[] {
  if (componentId === "keyword-spend-chart") {
    return [
      { keyword: "brand shoes", cost: 892 },
      { keyword: "running sneakers", cost: 654 },
      { keyword: "comfort sandals", cost: 421 },
      { keyword: "winter boots", cost: 312 },
      { keyword: "casual loafers", cost: 198 },
      { keyword: "formal oxfords", cost: 176 },
      { keyword: "flip flops", cost: 145 },
      { keyword: "hiking boots", cost: 132 },
      { keyword: "dress heels", cost: 118 },
      { keyword: "canvas sneakers", cost: 98 },
    ];
  }
  if (componentId === "spend-by-campaign-bar") {
    return [
      { name: "Summer Sale", value: 892 },
      { name: "Athletic", value: 654 },
      { name: "Winter 2024", value: 421 },
      { name: "Everyday", value: 312 },
      { name: "Brand Awareness", value: 198 },
    ];
  }
  return [
    { name: "A", value: 100 },
    { name: "B", value: 200 },
    { name: "C", value: 150 },
  ];
}

function getMockLineChartData(componentId: string): Record<string, unknown>[] {
  if (componentId === "daily-spend") {
    const baseDate = new Date("2025-02-01");
    const days = 28;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const cost = Math.round(
        50000 + Math.sin(i * 0.3) * 30000 + Math.random() * 20000
      );
      return {
        date: d.toISOString().slice(0, 10),
        cost_micros: cost * 1_000_000,
      };
    });
  }
  return [
    { date: "2025-02-01", value: 100 },
    { date: "2025-02-02", value: 150 },
    { date: "2025-02-03", value: 120 },
    { date: "2025-02-04", value: 180 },
    { date: "2025-02-05", value: 200 },
  ];
}

function getMockPieChartData(componentId: string): Record<string, unknown>[] {
  if (componentId === "spend-by-campaign-pie") {
    return [
      { name: "Summer Sale", value: 892 },
      { name: "Athletic", value: 654 },
      { name: "Winter 2024", value: 421 },
      { name: "Everyday", value: 312 },
      { name: "Brand Awareness", value: 198 },
    ];
  }
  return [
    { name: "A", value: 100 },
    { name: "B", value: 200 },
    { name: "C", value: 150 },
    { name: "D", value: 80 },
  ];
}

function getMockAreaChartData(componentId: string): Record<string, unknown>[] {
  if (componentId === "impressions-over-time") {
    const baseDate = new Date("2025-02-01");
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        impressions: Math.round(80000 + Math.sin(i * 0.5) * 30000 + i * 500),
      };
    });
  }
  return [
    { date: "2025-02-01", value: 100 },
    { date: "2025-02-02", value: 150 },
    { date: "2025-02-03", value: 120 },
    { date: "2025-02-04", value: 180 },
    { date: "2025-02-05", value: 200 },
  ];
}

function getMockComboChartData(componentId: string): Record<string, unknown>[] {
  const baseDate = new Date("2025-02-01");
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const cost = Math.round(
      50000 + Math.sin(i * 0.3) * 20000 + (i * 1000)
    );
    const impressions = Math.round(
      80000 + Math.sin(i * 0.5) * 25000 + i * 800
    );
    return {
      date: d.toISOString().slice(0, 10),
      cost_micros: cost * 1_000,
      impressions,
    };
  });
}

function getMockComparisonChartData(
  componentId: string
): Record<string, unknown>[] {
  const campaigns = [
    "Summer Sale",
    "Athletic",
    "Winter 2024",
    "Everyday",
    "Brand Awareness",
  ];
  return campaigns.map((name, i) => ({
    name,
    this_week: Math.round(800 + (i + 1) * 120 + Math.random() * 100),
    last_week: Math.round(600 + (i + 1) * 100 + Math.random() * 80),
  }));
}

function getMockSingleMetricData(
  _componentId: string
): Record<string, unknown>[] {
  return [
    {
      total_spend: 450.0,
      impressions: 1200.0,
      clicks: 180.0,
      conversions: 12.0,
      roas: 4.0,
      ctr_pct: 15.0,
    },
  ];
}

function getMockStackedBarData(component: DashboardComponent): Record<string, unknown>[] {
  const xKey = component.data_keys?.x ?? "date";
  const seriesKeys = component.data_keys?.series ?? ["search", "display", "shopping"];
  const baseDate = new Date("2025-02-24");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const row: Record<string, unknown> = {
      [xKey]: d.toISOString().slice(0, 10),
    };
    const values = [
      Math.round(300000000 + Math.random() * 200000000),
      Math.round(150000000 + Math.random() * 100000000),
    ];
    seriesKeys.forEach((k, idx) => {
      row[k] = values[idx] ?? Math.round(80000000 + Math.random() * 60000000);
    });
    return row;
  });
}

function getMockFunnelData(): Record<string, unknown>[] {
  return [
    { name: "Impressions", value: 125000 },
    { name: "Clicks", value: 3400 },
    { name: "Conversions", value: 120 },
    { name: "Purchases", value: 45 },
  ];
}

function getMockScatterData(component: DashboardComponent): Record<string, unknown>[] {
  const xKey = component.data_keys?.x ?? "spend";
  const yKey = component.data_keys?.series?.[0] ?? "conversions";
  const nameKey = "campaign.name";
  return Array.from({ length: 15 }, (_, i) => ({
    [xKey]: Math.round(100000000 + Math.random() * 900000000),
    [yKey]: Math.round(2 + Math.random() * 20),
    [nameKey]: `Campaign ${i + 1}`,
  }));
}

function getMockGaugeData(): Record<string, unknown>[] {
  return [{ utilization: 73.2 }];
}

function getMockHorizontalBarData(component: DashboardComponent): Record<string, unknown>[] {
  const labelKey = component.data_keys?.x ?? "name";
  const valueKey = component.data_keys?.series?.[0] ?? "value";
  const campaigns = [
    { label: "Summer Sale", val: 892000000 },
    { label: "Athletic", val: 654000000 },
    { label: "Winter 2024", val: 421000000 },
    { label: "Everyday", val: 312000000 },
    { label: "Brand Awareness", val: 198000000 },
    { label: "Spring Collection", val: 176000000 },
    { label: "Holiday Promo", val: 145000000 },
    { label: "Back to School", val: 132000000 },
    { label: "Flash Sale", val: 118000000 },
    { label: "New Arrivals", val: 98000000 },
  ];
  return campaigns.map((c) => ({
    [labelKey]: c.label,
    [valueKey]: c.val,
  }));
}
