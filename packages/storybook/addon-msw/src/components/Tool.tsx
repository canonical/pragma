import { LightningIcon } from "@storybook/icons";
import React, { memo, useCallback, useEffect } from "react";
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

  // TODO: can be used to add keyboard shortcut
  // useEffect(() => {
  //   api.setAddonShortcut(ADDON_ID, {
  //     label: "Toggle Baseline Grid",
  //     defaultShortcut: ["O"],
  //     actionName: "baseline",
  //     showInMenu: false,
  //     action: toggle,
  //   });
  // }, [toggle, api]);

  return (
    <IconButton
      key={TOOL_ID}
      active={isActive}
      disabled={isLocked}
      title={isActive ? "MSW Active" : "MSW Inactive"}
      onClick={toggle}
    >
      <LightningIcon />
    </IconButton>
  );
});
