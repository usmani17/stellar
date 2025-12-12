import React, { useState } from "react";
import {
  Avatar,
  AutopilotCard,
  Badge,
  Banner,
  Checkbox,
  IntegrationCard,
  Radio,
  RuleCard,
  SocialCard,
  StatusTag,
  Toggle,
  Tooltip,
} from "../components/ui";

export const Components: React.FC = () => {
  return (
    <div className="min-h-screen bg-sandstorm-s0 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-forest-f60 mb-4 font-agrandir">
            Component Library
          </h1>
          <p className="text-xl text-neutral-n400 font-inter">
            A collection of reusable UI components built with the PIXIS design
            system
          </p>
        </div>

        {/* Avatar Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Avatar
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Entity Avatar Variants */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Entity Avatar
              </h3>
              <div className="flex flex-wrap items-end gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="entity" size="sm" text="B" />
                  <span className="text-sm text-neutral-n400">Small (sm)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="entity" size="md" text="B" />
                  <span className="text-sm text-neutral-n400">Medium (md)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="entity" size="lg" text="B" />
                  <span className="text-sm text-neutral-n400">Large (lg)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="entity" size="xl" text="B" />
                  <span className="text-sm text-neutral-n400">
                    Extra Large (xl)
                  </span>
                </div>
              </div>
            </div>

            {/* User Avatar Variants */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                User Avatar
              </h3>
              <div className="flex flex-wrap items-end gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="sm" text="B" />
                  <span className="text-sm text-neutral-n400">Small (sm)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="md" text="B" />
                  <span className="text-sm text-neutral-n400">Medium (md)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="lg" text="B" />
                  <span className="text-sm text-neutral-n400">Large (lg)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="xl" text="B" />
                  <span className="text-sm text-neutral-n400">
                    Extra Large (xl)
                  </span>
                </div>
              </div>
            </div>

            {/* User Avatar with Status */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                User Avatar with Status Indicator
              </h3>
              <div className="flex flex-wrap items-end gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="sm" text="B" showStatus />
                  <span className="text-sm text-neutral-n400">
                    Small with Status
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="md" text="B" showStatus />
                  <span className="text-sm text-neutral-n400">
                    Medium with Status
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="lg" text="B" showStatus />
                  <span className="text-sm text-neutral-n400">
                    Large with Status
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="xl" text="B" showStatus />
                  <span className="text-sm text-neutral-n400">
                    Extra Large with Status
                  </span>
                </div>
              </div>
            </div>

            {/* Avatar with Different Text */}
            <div>
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Avatar with Different Initials
              </h3>
              <div className="flex flex-wrap items-end gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="md" text="John Doe" />
                  <span className="text-sm text-neutral-n400">JD</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="user" size="md" text="Alice" />
                  <span className="text-sm text-neutral-n400">A</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar
                    variant="user"
                    size="md"
                    text="Bob Smith"
                    showStatus
                  />
                  <span className="text-sm text-neutral-n400">
                    BS (with status)
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar variant="entity" size="md" text="Company Name" />
                  <span className="text-sm text-neutral-n400">CN</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Badge Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Badge
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Badge Variants */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Badge Variants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Success | Added */}
                <div className="flex flex-col gap-3 p-4 border border-sandstorm-s40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant="success">25</Badge>
                    <span className="text-sm font-semibold text-neutral-n1000 font-inter">
                      Success | Added
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-inter">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-forest-f40"></div>
                      <span className="text-neutral-n400">
                        Background:{" "}
                        <code className="text-neutral-n1000">#136d6d</code>{" "}
                        (forest-f40)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-sandstorm-s0"></div>
                      <span className="text-neutral-n400">
                        Text:{" "}
                        <code className="text-neutral-n1000">#f9f9f6</code>{" "}
                        (sandstorm-s0)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important | Urgent */}
                <div className="flex flex-col gap-3 p-4 border border-sandstorm-s40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant="important">25</Badge>
                    <span className="text-sm font-semibold text-neutral-n1000 font-inter">
                      Important | Urgent
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-inter">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-red-r40"></div>
                      <span className="text-neutral-n400">
                        Background:{" "}
                        <code className="text-neutral-n1000">#b51111</code>{" "}
                        (red-r40)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-sandstorm-s0"></div>
                      <span className="text-neutral-n400">
                        Text:{" "}
                        <code className="text-neutral-n1000">#f9f9f6</code>{" "}
                        (sandstorm-s0)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Low Priority */}
                <div className="flex flex-col gap-3 p-4 border border-sandstorm-s40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant="lowPriority">25</Badge>
                    <span className="text-sm font-semibold text-neutral-n1000 font-inter">
                      Low Priority
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-inter">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-sandstorm-s50"></div>
                      <span className="text-neutral-n400">
                        Background:{" "}
                        <code className="text-neutral-n1000">#e4e4d7</code>{" "}
                        (sandstorm-s50)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-forest-f60"></div>
                      <span className="text-neutral-n400">
                        Text:{" "}
                        <code className="text-neutral-n1000">#072929</code>{" "}
                        (forest-f60)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary */}
                <div className="flex flex-col gap-3 p-4 border border-sandstorm-s40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant="primary">25</Badge>
                    <span className="text-sm font-semibold text-neutral-n1000 font-inter">
                      Primary
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-inter">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-forest-f60"></div>
                      <span className="text-neutral-n400">
                        Background:{" "}
                        <code className="text-neutral-n1000">#072929</code>{" "}
                        (forest-f60)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-white"></div>
                      <span className="text-neutral-n400">
                        Text:{" "}
                        <code className="text-neutral-n1000">#ffffff</code>{" "}
                        (neutral-n0)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Failed | Removed */}
                <div className="flex flex-col gap-3 p-4 border border-sandstorm-s40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge variant="failed">25</Badge>
                    <span className="text-sm font-semibold text-neutral-n1000 font-inter">
                      Failed | Removed
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 text-xs font-inter">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-red-r40"></div>
                      <span className="text-neutral-n400">
                        Background:{" "}
                        <code className="text-neutral-n1000">#b51111</code>{" "}
                        (red-r40)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-sandstorm-s40 bg-sandstorm-s0"></div>
                      <span className="text-neutral-n400">
                        Text:{" "}
                        <code className="text-neutral-n1000">#f9f9f6</code>{" "}
                        (sandstorm-s0)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Checkbox Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Checkbox
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Small Size Checkboxes */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Small Size (24px)
              </h3>
              <div className="space-y-6">
                {/* Unchecked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Unchecked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" label="Label" hover />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Checked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" checked />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" checked hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" checked label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" checked label="Label" hover />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" checked disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Indeterminate States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Indeterminate
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" indeterminate />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" indeterminate hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="small" indeterminate label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox
                        size="small"
                        indeterminate
                        label="Label"
                        hover
                      />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Size Checkboxes */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Large Size (32px)
              </h3>
              <div className="space-y-6">
                {/* Unchecked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Unchecked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" label="Label" hover />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Checked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" checked />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" checked hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" checked label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" checked label="Label" hover />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" checked disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Indeterminate States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Indeterminate
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" indeterminate />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" indeterminate hover />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox size="large" indeterminate label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Checkbox
                        size="large"
                        indeterminate
                        label="Label"
                        hover
                      />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Example */}
            <div>
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Interactive Example
              </h3>
              <div className="space-y-4">
                <InteractiveCheckboxExample />
              </div>
            </div>
          </div>
        </section>

        {/* Radio Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Radio
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Small Size Radios */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Small Size (14px)
              </h3>
              <div className="space-y-6">
                {/* Unchecked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Unchecked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" state="hover" />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" label="Label" state="hover" />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Checked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" checked />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" checked state="hover" />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" checked label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" checked invalid label="Label" />
                      <span className="text-sm text-neutral-n400">Invalid</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="small" checked disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Size Radios */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Large Size (20px)
              </h3>
              <div className="space-y-6">
                {/* Unchecked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Unchecked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" state="hover" />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" label="Label" state="hover" />
                      <span className="text-sm text-neutral-n400">
                        With Label (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checked States */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Checked
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" checked />
                      <span className="text-sm text-neutral-n400">Default</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" checked state="hover" />
                      <span className="text-sm text-neutral-n400">Hover</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" checked label="Label" />
                      <span className="text-sm text-neutral-n400">
                        With Label
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" checked invalid label="Label" />
                      <span className="text-sm text-neutral-n400">Invalid</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Radio size="large" checked disabled label="Label" />
                      <span className="text-sm text-neutral-n400">
                        Disabled
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Example */}
            <div>
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Interactive Example
              </h3>
              <div className="space-y-4">
                <InteractiveRadioExample />
              </div>
            </div>
          </div>
        </section>

        {/* StatusTag Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Status Tag
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Small Size Tags */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Small Size
              </h3>
              <div className="space-y-6">
                {/* Default Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Default
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="default">
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="default" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="default" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="default"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Info Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Info
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="info">
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="info" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="info" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="info"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Success Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Success
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="success">
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="success" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="success" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="success"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Threat Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Threat
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="threat">
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="threat" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="threat" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="threat"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Warning Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Warning
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="warning">
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="warning" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="warning" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="warning"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Wasted Spends Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Wasted Spends
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="wastedSpends">
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="wastedSpends"
                      iconBefore
                    >
                      Tag
                    </StatusTag>
                    <StatusTag size="small" appearance="wastedSpends" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="small"
                      appearance="wastedSpends"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Close Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Close
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="small" appearance="close">
                      Tag
                    </StatusTag>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Size Tags */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Large Size
              </h3>
              <div className="space-y-6">
                {/* Default Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Default
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="default">
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="default" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="default" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="default"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Info Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Info
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="info">
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="info" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="info" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="info"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Success Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Success
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="success">
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="success" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="success" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="success"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Threat Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Threat
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="threat">
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="threat" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="threat" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="threat"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Warning Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Warning
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="warning">
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="warning" iconBefore>
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="warning" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="warning"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Wasted Spends Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Wasted Spends
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="wastedSpends">
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="wastedSpends"
                      iconBefore
                    >
                      Tag
                    </StatusTag>
                    <StatusTag size="large" appearance="wastedSpends" iconAfter>
                      Tag
                    </StatusTag>
                    <StatusTag
                      size="large"
                      appearance="wastedSpends"
                      iconBefore
                      iconAfter
                    >
                      Tag
                    </StatusTag>
                  </div>
                </div>

                {/* Close Appearance */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Close
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <StatusTag size="large" appearance="close">
                      Tag
                    </StatusTag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Toggle Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Toggle
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Regular Size Toggles */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Regular Size
              </h3>
              <div className="space-y-6">
                {/* Default State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Default
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" checked />
                      <span className="text-sm text-neutral-n400">Checked</span>
                    </div>
                  </div>
                </div>

                {/* Hover State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Hover
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" state="hover" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" checked state="hover" />
                      <span className="text-sm text-neutral-n400">
                        Checked (Hover)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Focus State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Focus
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" state="focus" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Focus)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" checked state="focus" />
                      <span className="text-sm text-neutral-n400">
                        Checked (Focus)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Disabled State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Disabled
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" disabled />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Disabled)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" checked disabled />
                      <span className="text-sm text-neutral-n400">
                        Checked (Disabled)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Indeterminate State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Indeterminate
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="regular" indeterminate />
                      <span className="text-sm text-neutral-n400">
                        Indeterminate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Large Size Toggles */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Large Size
              </h3>
              <div className="space-y-6">
                {/* Default State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Default
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" checked />
                      <span className="text-sm text-neutral-n400">Checked</span>
                    </div>
                  </div>
                </div>

                {/* Hover State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Hover
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" state="hover" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Hover)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" checked state="hover" />
                      <span className="text-sm text-neutral-n400">
                        Checked (Hover)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Focus State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Focus
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" state="focus" />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Focus)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" checked state="focus" />
                      <span className="text-sm text-neutral-n400">
                        Checked (Focus)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Disabled State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Disabled
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" disabled />
                      <span className="text-sm text-neutral-n400">
                        Unchecked (Disabled)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" checked disabled />
                      <span className="text-sm text-neutral-n400">
                        Checked (Disabled)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Indeterminate State */}
                <div>
                  <h4 className="text-base font-medium text-neutral-n600 mb-3 font-inter">
                    Indeterminate
                  </h4>
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                      <Toggle size="large" indeterminate />
                      <span className="text-sm text-neutral-n400">
                        Indeterminate
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Example */}
            <div>
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Interactive Example
              </h3>
              <div className="space-y-4">
                <InteractiveToggleExample />
              </div>
            </div>
          </div>
        </section>

        {/* Tooltip Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Tooltip
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="mb-8">
              <p
                className="text-base text-neutral-n400 mb-6"
                className="font-inter"
              >
                Tooltips provide additional context or information when users
                hover over, focus on, or tap an element. They're ideal for
                explaining unfamiliar actions, icons, or terminology without
                cluttering the interface.
              </p>
            </div>

            {/* Tooltip Positions */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Tooltip Positions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Left */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="left"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Left)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Left</span>
                </div>

                {/* Right */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="right"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Right)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Right</span>
                </div>

                {/* Top Left */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="topLeft"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Top Left)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Top Left</span>
                </div>

                {/* Top Right */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="topRight"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Top Right)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Top Right</span>
                </div>

                {/* Bottom Left */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="bottomLeft"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Bottom Left)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Bottom Left</span>
                </div>

                {/* Bottom Right */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="bottomRight"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Bottom Right)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">
                    Bottom Right
                  </span>
                </div>

                {/* Top Middle */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="topMiddle"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Top Middle)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">Top Middle</span>
                </div>

                {/* Bottom Middle */}
                <div className="flex flex-col items-center gap-4 p-6 border border-sandstorm-s40 rounded-xl">
                  <Tooltip
                    position="bottomMiddle"
                    heading="Heading"
                    description="It is a long established fact that a reader will be distracted."
                  >
                    <button className="px-4 py-2 bg-forest-f40 text-white rounded-lg hover:bg-forest-f50 transition-colors">
                      Hover me (Bottom Middle)
                    </button>
                  </Tooltip>
                  <span className="text-sm text-neutral-n400">
                    Bottom Middle
                  </span>
                </div>
              </div>
            </div>

            {/* Tooltip Examples */}
            <div>
              <h3 className="text-xl font-semibold text-forest-f60 mb-4 font-inter">
                Usage Examples
              </h3>
              <div className="space-y-6">
                {/* Icon with Tooltip */}
                <div className="flex items-center gap-4 p-4 border border-sandstorm-s40 rounded-xl">
                  <span
                    className="text-sm text-neutral-n400"
                    className="font-inter"
                  >
                    Icon with tooltip:
                  </span>
                  <Tooltip
                    position="topMiddle"
                    heading="Settings"
                    description="Configure your account preferences and application settings."
                  >
                    <button className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                          stroke="#072929"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16.6667 10C16.6667 9.16667 16.6667 8.33333 16.6667 7.5C16.6667 6.66667 16.6667 5.83333 16.6667 5C16.6667 4.16667 16.6667 3.33333 16.6667 2.5"
                          stroke="#072929"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3.33333 10C3.33333 9.16667 3.33333 8.33333 3.33333 7.5C3.33333 6.66667 3.33333 5.83333 3.33333 5C3.33333 4.16667 3.33333 3.33333 3.33333 2.5"
                          stroke="#072929"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </Tooltip>
                </div>

                {/* Button with Tooltip */}
                <div className="flex items-center gap-4 p-4 border border-sandstorm-s40 rounded-xl">
                  <span
                    className="text-sm text-neutral-n400"
                    className="font-inter"
                  >
                    Button with tooltip:
                  </span>
                  <Tooltip
                    position="topMiddle"
                    heading="Delete Item"
                    description="This action cannot be undone. Are you sure you want to proceed?"
                  >
                    <button className="px-4 py-2 bg-red-r30 text-white rounded-lg hover:bg-red-r40 transition-colors">
                      Delete
                    </button>
                  </Tooltip>
                </div>

                {/* Text with Tooltip */}
                <div className="flex items-center gap-4 p-4 border border-sandstorm-s40 rounded-xl">
                  <span
                    className="text-sm text-neutral-n400"
                    className="font-inter"
                  >
                    Text with tooltip:
                  </span>
                  <Tooltip
                    position="bottomMiddle"
                    heading="API Rate Limit"
                    description="You have made 450 requests this month. Your limit resets on the 1st of next month."
                  >
                    <span
                      className="text-base text-forest-f60 underline cursor-help"
                      className="font-inter"
                    >
                      API Usage: 450/1000
                    </span>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Banner Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Banner
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="mb-8">
              <p
                className="text-base text-neutral-n400 mb-6"
                className="font-inter"
              >
                Banners are used to communicate prominent messages such as
                alerts, confirmations, errors, or important information at the
                top of a page or section.
              </p>
            </div>

            {/* Banner Types */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Banner Types
              </h3>

              <div className="space-y-6">
                {/* Warning Banners */}
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Warning
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner type="warning" message="This is a warning" />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="warning"
                          message="This is a warning"
                          dismissable
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Dismissable
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="warning"
                          message="This is a warning"
                          dismissable
                          cta
                          ctaText="Retry"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        CTA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Banners */}
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Info
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner type="info" message="This is some info" />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="info"
                          message="This is some info"
                          dismissable
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Dismissable
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="info"
                          message="This is some info"
                          dismissable
                          cta
                          ctaText="Retry"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        CTA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Banners */}
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Error / Critical
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="error"
                          message="The apocalypse is coming and zombies are on the loose"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="error"
                          message="The apocalypse is coming and zombies are on the loose"
                          dismissable
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Dismissable
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="error"
                          message="The apocalypse is coming and zombies are on the loose"
                          dismissable
                          cta
                          ctaText="Retry"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        CTA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Success Banners */}
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Success
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="success"
                          message="The resistance is rising and hope just kicked in the door"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Default
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="success"
                          message="The resistance is rising and hope just kicked in the door"
                          dismissable
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        Dismissable
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Banner
                          type="success"
                          message="The resistance is rising and hope just kicked in the door"
                          dismissable
                          cta
                          ctaText="Retry"
                        />
                      </div>
                      <span className="text-sm text-neutral-n400 w-24">
                        CTA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold text-forest-f60 mb-6 font-agrandir">
            Cards
          </h2>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="mb-8">
              <p
                className="text-base text-neutral-n400 mb-6"
                className="font-inter"
              >
                Cards are compact, interactive elements used primarily for
                filtering content. They allow users to narrow down information
                based on categories, tags, or other criteria — helping
                streamline discovery and navigation across dashboards and
                tables.
              </p>
            </div>

            {/* Social Cards */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Social Cards (Used in Integrations and Onboarding)
              </h3>
              <div className="space-y-6">
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    States
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <SocialCard
                        title="Meta Ads"
                        description="For better access to Facebook Campaigns,"
                        state="default"
                        onButtonClick={() => console.log("Connect clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <SocialCard
                        title="Meta Ads"
                        description="For better access to Facebook Campaigns,"
                        state="hover"
                        onButtonClick={() => console.log("Connect clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <SocialCard
                        title="Meta Ads"
                        description="For better access to Facebook Campaigns,"
                        state="press"
                        onButtonClick={() => console.log("Connect clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Press
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Cards */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Integration Cards (Used in Integrations and Onboarding)
              </h3>
              <div className="space-y-6">
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Not Connected
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <IntegrationCard
                        title="Meta Ads"
                        description="Reach Your Target Audience Across Facebook, Instagram, and Messenger"
                        connected={false}
                        style="default"
                        onButtonClick={() => console.log("Connect clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <IntegrationCard
                        title="Meta Ads"
                        description="Reach Your Target Audience Across Facebook, Instagram, and Messenger"
                        connected={false}
                        style="hover"
                        onButtonClick={() => console.log("Connect clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Connected
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <IntegrationCard
                        title="Meta Ads"
                        description="Reach Your Target Audience Across Facebook, Instagram, and Messenger"
                        connected={true}
                        style="default"
                        onButtonClick={() => console.log("Manage clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <IntegrationCard
                        title="Meta Ads"
                        description="Reach Your Target Audience Across Facebook, Instagram, and Messenger"
                        connected={true}
                        style="hover"
                        onButtonClick={() => console.log("Manage clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule Cards */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Rule Cards (Used in Rules and Workflows)
              </h3>
              <div className="space-y-6">
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    States
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <RuleCard
                        title="Create from My Previous Rule"
                        description="Manually select which items are added to your set items are new"
                        type="default"
                        selected={false}
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <RuleCard
                        title="Create from My Previous Rule"
                        description="Manually select which items are added to your set items are new"
                        type="hover"
                        selected={false}
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <RuleCard
                        title="Create from My Previous Rule"
                        description="Manually select which items are added to your set items are new"
                        type="selected"
                        selected={true}
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Selected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Autopilot Cards */}
            <div className="mb-12">
              <h3
                className="text-xl font-semibold text-forest-f60 mb-6"
                className="font-inter"
              >
                Autopilot Dashboard Cards
              </h3>
              <div className="space-y-6">
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Info Type
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="Recommendations to be approved"
                        type="info"
                        state="default"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="Recommendations to be approved"
                        type="info"
                        state="hover"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="Recommendations to be approved"
                        type="info"
                        state="press"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Press
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Warning Type
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="AI Autopilot that need attention"
                        type="warning"
                        state="default"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="AI Autopilot that need attention"
                        type="warning"
                        state="hover"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="12"
                        description="AI Autopilot that need attention"
                        type="warning"
                        state="press"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Press
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4
                    className="text-base font-medium text-neutral-n600 mb-4"
                    className="font-inter"
                  >
                    Success Type
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="04"
                        description="Recommendations executed by autopilot"
                        type="success"
                        state="default"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Default
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="04"
                        description="Recommendations executed by autopilot"
                        type="success"
                        state="hover"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Hover
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <AutopilotCard
                        number="04"
                        description="Recommendations executed by autopilot"
                        type="success"
                        state="press"
                        onClick={() => console.log("Card clicked")}
                      />
                      <span className="text-sm text-neutral-n400 text-center">
                        Press
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// Interactive Toggle Example Component
const InteractiveToggleExample: React.FC = () => {
  const [notifications, setNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSave, setAutoSave] = useState(false);

  return (
    <div className="space-y-4 p-4 border border-sandstorm-s40 rounded-xl">
      <div className="flex items-center justify-between gap-4">
        <label className="text-base text-neutral-n1000" className="font-inter">
          Enable notifications
        </label>
        <Toggle
          size="regular"
          checked={notifications}
          onChange={setNotifications}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-base text-neutral-n1000" className="font-inter">
          Dark mode
        </label>
        <Toggle size="regular" checked={darkMode} onChange={setDarkMode} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-base text-neutral-n1000" className="font-inter">
          Auto-save documents
        </label>
        <Toggle size="regular" checked={autoSave} onChange={setAutoSave} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <label className="text-base text-neutral-n400" className="font-inter">
          Disabled option
        </label>
        <Toggle size="regular" checked disabled />
      </div>
    </div>
  );
};

// Interactive Radio Example Component
const InteractiveRadioExample: React.FC = () => {
  const [selected, setSelected] = useState<string>("option1");

  return (
    <div className="space-y-4 p-4 border border-sandstorm-s40 rounded-xl">
      <div className="flex items-center gap-4">
        <Radio
          size="small"
          checked={selected === "option1"}
          onChange={() => setSelected("option1")}
          label="Option 1"
        />
      </div>
      <div className="flex items-center gap-4">
        <Radio
          size="small"
          checked={selected === "option2"}
          onChange={() => setSelected("option2")}
          label="Option 2"
        />
      </div>
      <div className="flex items-center gap-4">
        <Radio
          size="small"
          checked={selected === "option3"}
          onChange={() => setSelected("option3")}
          label="Option 3"
        />
      </div>
      <div className="flex items-center gap-4">
        <Radio size="small" checked disabled label="Disabled option" />
      </div>
    </div>
  );
};

// Interactive Checkbox Example Component
const InteractiveCheckboxExample: React.FC = () => {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);

  return (
    <div className="space-y-4 p-4 border border-sandstorm-s40 rounded-xl">
      <div className="flex items-center gap-4">
        <Checkbox
          size="small"
          checked={checked1}
          onChange={setChecked1}
          label="Accept terms and conditions"
        />
      </div>
      <div className="flex items-center gap-4">
        <Checkbox
          size="small"
          checked={checked2}
          onChange={setChecked2}
          label="Subscribe to newsletter"
        />
      </div>
      <div className="flex items-center gap-4">
        <Checkbox
          size="small"
          indeterminate={indeterminate}
          checked={indeterminate}
          onChange={setIndeterminate}
          label="Select all items"
        />
      </div>
      <div className="flex items-center gap-4">
        <Checkbox size="small" checked disabled label="Disabled checkbox" />
      </div>
    </div>
  );
};
