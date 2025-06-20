import React from "react";
import { addons, types } from "storybook/internal/manager-api";
import { Panel } from "./components/Panel.js";
import { Tool } from "./components/Tool.js";
import { ADDON_ID, PANEL_ID, TOOL_ID } from "./constants.js";

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Register a tool in the toolbar
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: "Toggle MSW",
    match: ({ viewMode, tabId }) => !!viewMode?.match(/^(story|docs)$/),
    render: () => <Tool api={api} />,
  });

  // Register a panel to show active handlers
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "MSW",
    match: ({ viewMode }) => viewMode === "story",
    render: ({ active }) => <Panel api={api} active={active} />,
  });
});
