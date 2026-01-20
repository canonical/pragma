import { MenuIcon } from "@storybook/icons";
import { createElement, memo, useCallback, useEffect } from "react";
import { IconButton } from "storybook/internal/components";
import { type API, useGlobals } from "storybook/manager-api";
import { KEY, TOOL_ID } from "../constants.js";

export const Tool = memo(function MyAddonSelector({ api }: { api: API }) {
  const [globals, updateGlobals, storyGlobals] = useGlobals();

  const isLocked = KEY in storyGlobals;
  const isActive = !!globals[KEY];

  const toggle = useCallback(() => {
    updateGlobals({
      [KEY]: !isActive,
    });
  }, [isActive, updateGlobals]);

  useEffect(() => {
    api.setAddonShortcut("custom-toolbar-addon", {
      label: "Toggle baseline grid",
      defaultShortcut: ["G"],
      actionName: "Toggle",
      showInMenu: false,
      action: toggle,
    });
  }, [api, toggle]);

  return createElement(
    IconButton,
    {
      key: TOOL_ID,
      active: isActive,
      disabled: isLocked,
      title: "Show baseline grid",
      onClick: toggle,
    },
    createElement(MenuIcon),
    isActive ? "Baseline visible" : "Baseline hidden",
  );
});
