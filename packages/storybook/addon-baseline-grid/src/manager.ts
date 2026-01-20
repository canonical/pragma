import { createElement } from "react";
import { addons, types } from "storybook/manager-api";
import { ADDON_ID, TOOL_ID } from "./constants.js";
import { Tool } from "./lib/Tool.js";

// Register the addon
addons.register(ADDON_ID, (api) => {
	// Register a tool
	addons.add(TOOL_ID, {
		type: types.TOOL,
		title: "Baseline grid addon",
		match: ({ viewMode }) => !!viewMode?.match(/^(story)$/),
		render: () => createElement(Tool, { api }),
	});
});
