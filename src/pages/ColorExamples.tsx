import React from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { DashboardHeader } from "../components/layout/DashboardHeader";
import { useSidebar } from "../contexts/SidebarContext";
import {
  ExampleButton,
  Alert,
  ExampleStatusBadge,
  ExampleCard,
  ExampleInput,
  ExampleTable,
  ExampleIcon,
  ExampleGradient,
  ExampleMixed,
  CampaignStatusBadge,
  KPICard,
  FilterChip,
} from "../components/examples/ColorExamples";

// Helper function to get color class name
const getColorClass = (colorName: string, shade: string) => {
  const colorMap: Record<string, Record<string, string>> = {
    red: {
      "50": "bg-red-50",
      "100": "bg-red-100",
      "200": "bg-red-200",
      "300": "bg-red-300",
      "400": "bg-red-400",
      "500": "bg-red-500",
      "600": "bg-red-600",
      "700": "bg-red-700",
      "800": "bg-red-800",
      "900": "bg-red-900",
      "950": "bg-red-950",
    },
    sky: {
      "50": "bg-sky-50",
      "100": "bg-sky-100",
      "200": "bg-sky-200",
      "300": "bg-sky-300",
      "400": "bg-sky-400",
      "500": "bg-sky-500",
      "600": "bg-sky-600",
      "700": "bg-sky-700",
      "800": "bg-sky-800",
      "900": "bg-sky-900",
      "950": "bg-sky-950",
    },
    blue: {
      "50": "bg-blue-50",
      "100": "bg-blue-100",
      "200": "bg-blue-200",
      "300": "bg-blue-300",
      "400": "bg-blue-400",
      "500": "bg-blue-500",
      "600": "bg-blue-600",
      "700": "bg-blue-700",
      "800": "bg-blue-800",
      "900": "bg-blue-900",
      "950": "bg-blue-950",
    },
    cyan: {
      "50": "bg-cyan-50",
      "100": "bg-cyan-100",
      "200": "bg-cyan-200",
      "300": "bg-cyan-300",
      "400": "bg-cyan-400",
      "500": "bg-cyan-500",
      "600": "bg-cyan-600",
      "700": "bg-cyan-700",
      "800": "bg-cyan-800",
      "900": "bg-cyan-900",
      "950": "bg-cyan-950",
    },
    gray: {
      "50": "bg-gray-50",
      "100": "bg-gray-100",
      "200": "bg-gray-200",
      "300": "bg-gray-300",
      "400": "bg-gray-400",
      "500": "bg-gray-500",
      "600": "bg-gray-600",
      "700": "bg-gray-700",
      "800": "bg-gray-800",
      "900": "bg-gray-900",
      "950": "bg-gray-950",
    },
    lime: {
      "50": "bg-lime-50",
      "100": "bg-lime-100",
      "200": "bg-lime-200",
      "300": "bg-lime-300",
      "400": "bg-lime-400",
      "500": "bg-lime-500",
      "600": "bg-lime-600",
      "700": "bg-lime-700",
      "800": "bg-lime-800",
      "900": "bg-lime-900",
      "950": "bg-lime-950",
    },
    pink: {
      "50": "bg-pink-50",
      "100": "bg-pink-100",
      "200": "bg-pink-200",
      "300": "bg-pink-300",
      "400": "bg-pink-400",
      "500": "bg-pink-500",
      "600": "bg-pink-600",
      "700": "bg-pink-700",
      "800": "bg-pink-800",
      "900": "bg-pink-900",
      "950": "bg-pink-950",
    },
    rose: {
      "50": "bg-rose-50",
      "100": "bg-rose-100",
      "200": "bg-rose-200",
      "300": "bg-rose-300",
      "400": "bg-rose-400",
      "500": "bg-rose-500",
      "600": "bg-rose-600",
      "700": "bg-rose-700",
      "800": "bg-rose-800",
      "900": "bg-rose-900",
      "950": "bg-rose-950",
    },
    teal: {
      "50": "bg-teal-50",
      "100": "bg-teal-100",
      "200": "bg-teal-200",
      "300": "bg-teal-300",
      "400": "bg-teal-400",
      "500": "bg-teal-500",
      "600": "bg-teal-600",
      "700": "bg-teal-700",
      "800": "bg-teal-800",
      "900": "bg-teal-900",
      "950": "bg-teal-950",
    },
    zinc: {
      "50": "bg-zinc-50",
      "100": "bg-zinc-100",
      "200": "bg-zinc-200",
      "300": "bg-zinc-300",
      "400": "bg-zinc-400",
      "500": "bg-zinc-500",
      "600": "bg-zinc-600",
      "700": "bg-zinc-700",
      "800": "bg-zinc-800",
      "900": "bg-zinc-900",
      "950": "bg-zinc-950",
    },
    amber: {
      "50": "bg-amber-50",
      "100": "bg-amber-100",
      "200": "bg-amber-200",
      "300": "bg-amber-300",
      "400": "bg-amber-400",
      "500": "bg-amber-500",
      "600": "bg-amber-600",
      "700": "bg-amber-700",
      "800": "bg-amber-800",
      "900": "bg-amber-900",
      "950": "bg-amber-950",
    },
    green: {
      "50": "bg-green-50",
      "100": "bg-green-100",
      "200": "bg-green-200",
      "300": "bg-green-300",
      "400": "bg-green-400",
      "500": "bg-green-500",
      "600": "bg-green-600",
      "700": "bg-green-700",
      "800": "bg-green-800",
      "900": "bg-green-900",
      "950": "bg-green-950",
    },
    slate: {
      "50": "bg-slate-50",
      "100": "bg-slate-100",
      "200": "bg-slate-200",
      "300": "bg-slate-300",
      "400": "bg-slate-400",
      "500": "bg-slate-500",
      "600": "bg-slate-600",
      "700": "bg-slate-700",
      "800": "bg-slate-800",
      "900": "bg-slate-900",
      "950": "bg-slate-950",
    },
    stone: {
      "50": "bg-stone-50",
      "100": "bg-stone-100",
      "200": "bg-stone-200",
      "300": "bg-stone-300",
      "400": "bg-stone-400",
      "500": "bg-stone-500",
      "600": "bg-stone-600",
      "700": "bg-stone-700",
      "800": "bg-stone-800",
      "900": "bg-stone-900",
      "950": "bg-stone-950",
    },
    indigo: {
      "50": "bg-indigo-50",
      "100": "bg-indigo-100",
      "200": "bg-indigo-200",
      "300": "bg-indigo-300",
      "400": "bg-indigo-400",
      "500": "bg-indigo-500",
      "600": "bg-indigo-600",
      "700": "bg-indigo-700",
      "800": "bg-indigo-800",
      "900": "bg-indigo-900",
      "950": "bg-indigo-950",
    },
    orange: {
      "50": "bg-orange-50",
      "100": "bg-orange-100",
      "200": "bg-orange-200",
      "300": "bg-orange-300",
      "400": "bg-orange-400",
      "500": "bg-orange-500",
      "600": "bg-orange-600",
      "700": "bg-orange-700",
      "800": "bg-orange-800",
      "900": "bg-orange-900",
      "950": "bg-orange-950",
    },
    purple: {
      "50": "bg-purple-50",
      "100": "bg-purple-100",
      "200": "bg-purple-200",
      "300": "bg-purple-300",
      "400": "bg-purple-400",
      "500": "bg-purple-500",
      "600": "bg-purple-600",
      "700": "bg-purple-700",
      "800": "bg-purple-800",
      "900": "bg-purple-900",
      "950": "bg-purple-950",
    },
    violet: {
      "50": "bg-violet-50",
      "100": "bg-violet-100",
      "200": "bg-violet-200",
      "300": "bg-violet-300",
      "400": "bg-violet-400",
      "500": "bg-violet-500",
      "600": "bg-violet-600",
      "700": "bg-violet-700",
      "800": "bg-violet-800",
      "900": "bg-violet-900",
      "950": "bg-violet-950",
    },
    yellow: {
      "50": "bg-yellow-50",
      "100": "bg-yellow-100",
      "200": "bg-yellow-200",
      "300": "bg-yellow-300",
      "400": "bg-yellow-400",
      "500": "bg-yellow-500",
      "600": "bg-yellow-600",
      "700": "bg-yellow-700",
      "800": "bg-yellow-800",
      "900": "bg-yellow-900",
      "950": "bg-yellow-950",
    },
    emerald: {
      "50": "bg-emerald-50",
      "100": "bg-emerald-100",
      "200": "bg-emerald-200",
      "300": "bg-emerald-300",
      "400": "bg-emerald-400",
      "500": "bg-emerald-500",
      "600": "bg-emerald-600",
      "700": "bg-emerald-700",
      "800": "bg-emerald-800",
      "900": "bg-emerald-900",
      "950": "bg-emerald-950",
    },
    fuchsia: {
      "50": "bg-fuchsia-50",
      "100": "bg-fuchsia-100",
      "200": "bg-fuchsia-200",
      "300": "bg-fuchsia-300",
      "400": "bg-fuchsia-400",
      "500": "bg-fuchsia-500",
      "600": "bg-fuchsia-600",
      "700": "bg-fuchsia-700",
      "800": "bg-fuchsia-800",
      "900": "bg-fuchsia-900",
      "950": "bg-fuchsia-950",
    },
  };
  return colorMap[colorName]?.[shade] || "";
};

// Helper component for color scales
const ColorScale: React.FC<{ name: string; shades: string[] }> = ({
  name,
  shades,
}) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      {name.charAt(0).toUpperCase() + name.slice(1)} Scale
    </h3>
    <div className="flex gap-2 flex-wrap">
      {shades.map((shade) => (
        <div key={shade} className="flex flex-col items-center">
          <div
            className={`w-12 h-12 rounded ${getColorClass(
              name,
              shade
            )} border border-gray-200`}
          />
          <span className="text-xs text-gray-600 mt-1">{shade}</span>
        </div>
      ))}
    </div>
  </div>
);

export const ColorExamples: React.FC = () => {
  const { sidebarWidth } = useSidebar();
  const tableItems = [
    { id: "1", name: "Item 1", status: "active" },
    { id: "2", name: "Item 2", status: "pending" },
    { id: "3", name: "Item 3", status: "inactive" },
  ];

  const standardShades = [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
  ];
  const colorScales = [
    "red",
    "sky",
    "blue",
    "cyan",
    "gray",
    "lime",
    "pink",
    "rose",
    "teal",
    "zinc",
    "amber",
    "green",
    "slate",
    "stone",
    "indigo",
    "orange",
    "purple",
    "violet",
    "yellow",
    "emerald",
    "fuchsia",
  ];

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-sandstorm-s0">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-forest-f60 mb-2">
              Color Examples
            </h1>
            <p className="text-forest-f30 mb-8">
              Examples of Token Studio colors and custom colors in action
            </p>

            {/* Buttons Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Buttons
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap gap-4">
                  <ExampleButton variant="primary">Primary</ExampleButton>
                  <ExampleButton variant="secondary">Secondary</ExampleButton>
                  <ExampleButton variant="danger">Danger</ExampleButton>
                  <ExampleButton variant="success">Success</ExampleButton>
                </div>
              </div>
            </section>

            {/* Alerts Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Alerts
              </h2>
              <div className="space-y-4">
                <Alert
                  type="success"
                  message="Operation completed successfully!"
                />
                <Alert
                  type="error"
                  message="Something went wrong. Please try again."
                />
                <Alert
                  type="warning"
                  message="Please review your input before submitting."
                />
                <Alert type="info" message="New features are now available." />
              </div>
            </section>

            {/* Status Badges Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Status Badges
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap gap-4">
                  <ExampleStatusBadge status="active" />
                  <ExampleStatusBadge status="inactive" />
                  <ExampleStatusBadge status="pending" />
                  <CampaignStatusBadge status="Enable" />
                  <CampaignStatusBadge status="Paused" />
                  <CampaignStatusBadge status="Archived" />
                </div>
              </div>
            </section>

            {/* Cards Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Cards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ExampleCard
                  title="Token Studio Card"
                  description="This card uses Token Studio gray colors"
                >
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    Action
                  </button>
                </ExampleCard>
                <ExampleMixed />
              </div>
            </section>

            {/* Input Fields Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Input Fields
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-4 max-w-md">
                  <ExampleInput
                    label="Standard Input"
                    placeholder="Enter text here"
                  />
                  <ExampleInput
                    label="Email Input"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </section>

            {/* Table Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Tables
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6 overflow-x-auto">
                <ExampleTable items={tableItems} />
              </div>
            </section>

            {/* Icons Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Icons
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <ExampleIcon type="success" />
                    <span className="text-gray-700">Success Icon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExampleIcon type="error" />
                    <span className="text-gray-700">Error Icon</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExampleIcon type="info" />
                    <span className="text-gray-700">Info Icon</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Gradients Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Gradients
              </h2>
              <ExampleGradient>
                <h3 className="text-xl font-semibold mb-2">
                  Gradient Background
                </h3>
                <p>This uses Token Studio colors in a gradient</p>
              </ExampleGradient>
            </section>

            {/* KPI Cards Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                KPI Cards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard label="Total Sales" value="$12,345" trend="up" />
                <KPICard label="Total Spends" value="$8,901" trend="down" />
                <KPICard label="ROAS" value="1.38x" />
              </div>
            </section>

            {/* Filter Chips Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Filter Chips
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Active" active={true} />
                  <FilterChip label="Inactive" active={false} />
                  <FilterChip
                    label="Pending"
                    active={true}
                    onRemove={() => {}}
                  />
                  <FilterChip
                    label="Archived"
                    active={false}
                    onRemove={() => {}}
                  />
                </div>
              </div>
            </section>

            {/* Neutral Variants Usage Examples */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Neutral Variants in Action
              </h2>
              <div className="space-y-6">
                {/* Background Examples */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Background Colors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-neutral-n0 border border-neutral-n30">
                      <p className="text-sm font-medium text-neutral-n900">
                        bg-neutral-n0
                      </p>
                      <p className="text-xs text-neutral-n500 mt-1">
                        Lightest background
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-n10 border border-neutral-n30">
                      <p className="text-sm font-medium text-neutral-n900">
                        bg-neutral-n10
                      </p>
                      <p className="text-xs text-neutral-n500 mt-1">
                        Subtle background
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-neutral-n20 border border-neutral-n30">
                      <p className="text-sm font-medium text-neutral-n900">
                        bg-neutral-n20
                      </p>
                      <p className="text-xs text-neutral-n500 mt-1">
                        Light background
                      </p>
                    </div>
                  </div>
                </div>

                {/* Text Color Examples */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Text Colors
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="space-y-2">
                      <p className="text-neutral-n900 text-base font-semibold">
                        Primary Text (n900) - Darkest text for high contrast
                      </p>
                      <p className="text-neutral-n500 text-base">
                        Secondary Text (n500) - Medium gray for body text
                      </p>
                      <p className="text-neutral-n300 text-base">
                        Tertiary Text (n300) - Light gray for hints
                      </p>
                      <p className="text-neutral-n100 text-sm">
                        Muted Text (n100) - Very light for disabled states
                      </p>
                    </div>
                  </div>
                </div>

                {/* Border Examples */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Border Colors
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="space-y-3">
                      <div className="p-3 border-2 border-neutral-n30 rounded">
                        <p className="text-sm text-neutral-n900">
                          Border n30 - Light border
                        </p>
                      </div>
                      <div className="p-3 border-2 border-neutral-n40 rounded">
                        <p className="text-sm text-neutral-n900">
                          Border n40 - Medium border
                        </p>
                      </div>
                      <div className="p-3 border-2 border-neutral-n50 rounded">
                        <p className="text-sm text-neutral-n900">
                          Border n50 - Strong border
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Examples with Neutral Variants */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Card Examples
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-xl bg-neutral-n10 border border-neutral-n30">
                      <h4 className="text-lg font-semibold text-neutral-n900 mb-2">
                        Card with n10 Background
                      </h4>
                      <p className="text-sm text-neutral-n500">
                        This card uses neutral-n10 for a subtle background with
                        n30 border.
                      </p>
                    </div>
                    <div className="p-6 rounded-xl bg-neutral-n20 border border-neutral-n40">
                      <h4 className="text-lg font-semibold text-neutral-n900 mb-2">
                        Card with n20 Background
                      </h4>
                      <p className="text-sm text-neutral-n500">
                        This card uses neutral-n20 for a slightly darker
                        background.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Color Palette Preview */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Color Palette Preview
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-6">
                  {/* All color scales from @theme block */}
                  {colorScales.map((colorName) => (
                    <ColorScale
                      key={colorName}
                      name={colorName}
                      shades={standardShades}
                    />
                  ))}

                  {/* Neutral Scale - Token Studio (includes 750) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Neutral Scale (Token Studio)
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { shade: "50", class: "bg-neutral-50" },
                        { shade: "100", class: "bg-neutral-100" },
                        { shade: "200", class: "bg-neutral-200" },
                        { shade: "300", class: "bg-neutral-300" },
                        { shade: "400", class: "bg-neutral-400" },
                        { shade: "500", class: "bg-neutral-500" },
                        { shade: "600", class: "bg-neutral-600" },
                        { shade: "700", class: "bg-neutral-700" },
                        { shade: "750", class: "bg-neutral-750" },
                        { shade: "800", class: "bg-neutral-800" },
                        { shade: "900", class: "bg-neutral-900" },
                        { shade: "950", class: "bg-neutral-950" },
                      ].map(({ shade, class: className }) => (
                        <div key={shade} className="flex flex-col items-center">
                          <div
                            className={`w-12 h-12 rounded ${className} border border-gray-200`}
                          />
                          <span className="text-xs text-gray-600 mt-1">
                            {shade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Neutral Scale - Custom Variants */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Neutral Scale (Custom Variants)
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { variant: "n0", class: "bg-neutral-n0" },
                        { variant: "n10", class: "bg-neutral-n10" },
                        { variant: "n20", class: "bg-neutral-n20" },
                        { variant: "n30", class: "bg-neutral-n30" },
                        { variant: "n40", class: "bg-neutral-n40" },
                        { variant: "n50", class: "bg-neutral-n50" },
                        { variant: "n60", class: "bg-neutral-n60" },
                        { variant: "n70", class: "bg-neutral-n70" },
                        { variant: "n80", class: "bg-neutral-n80" },
                        { variant: "n90", class: "bg-neutral-n90" },
                        { variant: "n100", class: "bg-neutral-n100" },
                        { variant: "n200", class: "bg-neutral-n200" },
                        { variant: "n300", class: "bg-neutral-n300" },
                        { variant: "n400", class: "bg-neutral-n400" },
                        { variant: "n500", class: "bg-neutral-n500" },
                        { variant: "n600", class: "bg-neutral-n600" },
                        { variant: "n700", class: "bg-neutral-n700" },
                        { variant: "n800", class: "bg-neutral-n800" },
                        { variant: "n900", class: "bg-neutral-n900" },
                        { variant: "n1000", class: "bg-neutral-n1000" },
                      ].map(({ variant, class: className }) => (
                        <div
                          key={variant}
                          className="flex flex-col items-center"
                        >
                          <div
                            className={`w-12 h-12 rounded ${className} border border-gray-200`}
                          />
                          <span className="text-xs text-gray-600 mt-1">
                            {variant}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Single Colors */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Single Colors
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded bg-black border border-gray-200" />
                        <span className="text-xs text-gray-600 mt-1">
                          black
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded bg-white border border-gray-200" />
                        <span className="text-xs text-gray-600 mt-1">
                          white
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Custom Colors
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded bg-sandstorm-s0 border border-gray-200" />
                        <span className="text-xs text-gray-600 mt-1">
                          sandstorm-s0
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded bg-forest-f40 border border-gray-200" />
                        <span className="text-xs text-gray-600 mt-1">
                          forest-f40
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded bg-forest-f60 border border-gray-200" />
                        <span className="text-xs text-gray-600 mt-1">
                          forest-f60
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
