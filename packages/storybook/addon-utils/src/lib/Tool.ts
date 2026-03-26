import {
  ContrastIcon,
  GridIcon,
  OutlineIcon,
  RulerIcon,
} from "@storybook/icons";
import { createElement, type FC, memo, useCallback, useEffect } from "react";
import { Select, ToggleButton } from "storybook/internal/components";
import {
  type API,
  useGlobals,
  useParameter,
} from "storybook/manager-api";
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

const gridOptions = GRID_MODES.map((mode) => ({
  value: mode,
  title: { none: "Off", intrinsic: "Intrinsic", responsive: "Responsive" }[
    mode
  ],
}));

const schemeOptions = SCHEME_MODES.map((mode) => ({
  value: mode,
  title: { none: "System", light: "Light", dark: "Dark" }[mode],
}));

export const Tool: FC<{ api: API }> = memo(function UtilsToolbar({ api }) {
  const [globals, updateGlobals] = useGlobals();

  // Read story-level parameter defaults
  const paramGrid = useParameter<GridMode>(KEY_GRID);
  const paramScheme = useParameter<SchemeMode>(KEY_SCHEME);

  // undefined = user hasn't touched → fall back to story parameter
  // any string (including "none") = user explicitly chose
  const rawGrid = globals[KEY_GRID] as GridMode | undefined;
  const rawScheme = globals[KEY_SCHEME] as SchemeMode | undefined;
  const gridMode: GridMode =
    rawGrid !== undefined ? rawGrid : paramGrid ?? "none";
  const scheme: SchemeMode =
    rawScheme !== undefined ? rawScheme : paramScheme ?? "none";

  const baseline: boolean = globals[KEY_BASELINE] ?? false;
  const outlines: boolean = globals[KEY_OUTLINES] ?? false;

  const setGrid = useCallback(
    (mode: GridMode) => updateGlobals({ [KEY_GRID]: mode }),
    [updateGlobals],
  );

  const setScheme = useCallback(
    (mode: SchemeMode) => updateGlobals({ [KEY_SCHEME]: mode }),
    [updateGlobals],
  );

  const toggleBaseline = useCallback(
    () => updateGlobals({ [KEY_BASELINE]: !baseline }),
    [baseline, updateGlobals],
  );

  const toggleOutlines = useCallback(
    () => updateGlobals({ [KEY_OUTLINES]: !outlines }),
    [outlines, updateGlobals],
  );

  // Keyboard shortcuts — cycle through modes
  const cycleGrid = useCallback(() => {
    const next =
      GRID_MODES[(GRID_MODES.indexOf(gridMode) + 1) % GRID_MODES.length];
    setGrid(next);
  }, [gridMode, setGrid]);

  const cycleScheme = useCallback(() => {
    const next =
      SCHEME_MODES[(SCHEME_MODES.indexOf(scheme) + 1) % SCHEME_MODES.length];
    setScheme(next);
  }, [scheme, setScheme]);

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

    // Grid select (same component as viewport selector)
    createElement(
      Select,
      {
        ariaLabel: "Grid layout mode",
        tooltip: "Grid layout",
        icon: createElement(GridIcon),
        defaultOptions: gridMode,
        options: gridOptions,
        onSelect: (value) => setGrid(value as GridMode),
      },
      gridMode !== "none" ? gridOptions.find((o) => o.value === gridMode)?.title : null,
    ),

    // Scheme select
    createElement(
      Select,
      {
        ariaLabel: "Color scheme",
        tooltip: "Color scheme",
        icon: createElement(ContrastIcon),
        defaultOptions: scheme,
        options: schemeOptions,
        onSelect: (value) => setScheme(value as SchemeMode),
      },
      scheme !== "none" ? schemeOptions.find((o) => o.value === scheme)?.title : null,
    ),

    // Baseline toggle
    createElement(
      ToggleButton,
      {
        title: "Toggle baseline grid",
        pressed: baseline,
        onClick: toggleBaseline,
        size: "small",
      },
      createElement(RulerIcon),
    ),

    // Outlines toggle
    createElement(
      ToggleButton,
      {
        title: "Toggle debug outlines",
        pressed: outlines,
        onClick: toggleOutlines,
        size: "small",
      },
      createElement(OutlineIcon),
    ),
  );
});
