import {
  ContrastIcon,
  GridIcon,
  OutlineIcon,
  RulerIcon,
} from "@storybook/icons";
import { createElement, type FC, memo, useCallback, useEffect } from "react";
import { Button } from "storybook/internal/components";
import { type API, useGlobals } from "storybook/manager-api";
import {
  ADDON_ID,
  GRID_MODES,
  type GridMode,
  KEY_BASELINE,
  KEY_GRID,
  KEY_OUTLINES,
  KEY_SCHEME,
  SCHEME_MODES,
  type SchemeMode,
} from "../constants.js";

const gridLabels: Record<GridMode, string> = {
  none: "Grid: off",
  intrinsic: "Grid: intrinsic",
  responsive: "Grid: responsive",
};

const schemeLabels: Record<SchemeMode, string> = {
  none: "Scheme: system",
  light: "Scheme: light",
  dark: "Scheme: dark",
};

export const Tool: FC<{ api: API }> = memo(function DebugToolbar({ api }) {
  const [globals, updateGlobals] = useGlobals();

  const gridMode: GridMode = globals[KEY_GRID] ?? "none";
  const scheme: SchemeMode = globals[KEY_SCHEME] ?? "none";
  const baseline: boolean = globals[KEY_BASELINE] ?? false;
  const outlines: boolean = globals[KEY_OUTLINES] ?? false;

  const cycleGrid = useCallback(() => {
    const next =
      GRID_MODES[(GRID_MODES.indexOf(gridMode) + 1) % GRID_MODES.length];
    updateGlobals({ [KEY_GRID]: next });
  }, [gridMode, updateGlobals]);

  const cycleScheme = useCallback(() => {
    const next =
      SCHEME_MODES[(SCHEME_MODES.indexOf(scheme) + 1) % SCHEME_MODES.length];
    updateGlobals({ [KEY_SCHEME]: next });
  }, [scheme, updateGlobals]);

  const toggleBaseline = useCallback(() => {
    updateGlobals({ [KEY_BASELINE]: !baseline });
  }, [baseline, updateGlobals]);

  const toggleOutlines = useCallback(() => {
    updateGlobals({ [KEY_OUTLINES]: !outlines });
  }, [outlines, updateGlobals]);

  useEffect(() => {
    api.setAddonShortcut(ADDON_ID, {
      label: "Cycle grid mode",
      defaultShortcut: ["G"],
      actionName: "CycleGrid",
      showInMenu: false,
      action: cycleGrid,
    });
  }, [api, cycleGrid]);

  useEffect(() => {
    api.setAddonShortcut(`${ADDON_ID}/scheme`, {
      label: "Cycle color scheme",
      defaultShortcut: ["S"],
      actionName: "CycleScheme",
      showInMenu: false,
      action: cycleScheme,
    });
  }, [api, cycleScheme]);

  useEffect(() => {
    api.setAddonShortcut(`${ADDON_ID}/baseline`, {
      label: "Toggle baseline grid",
      defaultShortcut: ["B"],
      actionName: "ToggleBaseline",
      showInMenu: false,
      action: toggleBaseline,
    });
  }, [api, toggleBaseline]);

  useEffect(() => {
    api.setAddonShortcut(`${ADDON_ID}/outlines`, {
      label: "Toggle debug outlines",
      defaultShortcut: ["O"],
      actionName: "ToggleOutlines",
      showInMenu: false,
      action: toggleOutlines,
    });
  }, [api, toggleOutlines]);

  return createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 2 } },

    createElement(
      Button,
      {
        variant: gridMode !== "none" ? "solid" : "ghost",
        size: "small",
        ariaLabel: false,
        onClick: cycleGrid,
      },
      createElement(GridIcon),
      gridLabels[gridMode],
    ),

    createElement(
      Button,
      {
        variant: scheme !== "none" ? "solid" : "ghost",
        size: "small",
        ariaLabel: false,
        onClick: cycleScheme,
      },
      createElement(ContrastIcon),
      schemeLabels[scheme],
    ),

    createElement(
      Button,
      {
        variant: baseline ? "solid" : "ghost",
        size: "small",
        ariaLabel: false,
        onClick: toggleBaseline,
      },
      createElement(RulerIcon),
      "Baseline",
    ),

    createElement(
      Button,
      {
        variant: outlines ? "solid" : "ghost",
        size: "small",
        ariaLabel: false,
        onClick: toggleOutlines,
      },
      createElement(OutlineIcon),
      "Outlines",
    ),
  );
});
