import { createElement } from "react";
import { type API, addons, types } from "storybook/manager-api";
import { ADDON_ID, PANEL_ID, TOOL_ID } from "./constants.js";
import { Panel } from "./lib/Panel.js";
import { Tool } from "./lib/Tool.js";

// Register the addon
addons.register(ADDON_ID, (api: API) => {
  // Register a tool in the toolbar
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: "Toggle MSW",
    match: ({ viewMode }: { viewMode?: string; tabId?: string }) =>
      !!viewMode?.match(/^(story|docs)$/),
    render: () => createElement(Tool, { api }),
  });

  // Register a panel to show active handlers
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "MSW",
    match: ({ viewMode }: { viewMode?: string }) => viewMode === "story",
    render: ({ active }: { active?: boolean }) =>
      createElement(Panel, { api, active }),
  });
});
