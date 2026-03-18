import { createElement } from "react";
import { addons, types } from "storybook/manager-api";
import { ADDON_ID, PANEL_ID } from "./constants.js";
import { Panel } from "./lib/Panel.js";

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "Form State",
    match: ({ viewMode }: { viewMode?: string }) => viewMode === "story",
    render: ({ active }: { active?: boolean }) =>
      createElement(Panel, { active }),
  });
});
