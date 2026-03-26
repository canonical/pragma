import {
  ContrastIcon,
  GridIcon,
  OutlineIcon,
  RulerIcon,
} from "@storybook/icons";
import { createElement, type FC, memo, useCallback, useEffect } from "react";
import {
  IconButton,
  TooltipLinkList,
  WithTooltip,
} from "storybook/internal/components";
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

const gridLabels: Record<GridMode, string> = {
  none: "Off",
  intrinsic: "Intrinsic",
  responsive: "Responsive",
};

const schemeLabels: Record<SchemeMode, string> = {
  none: "System",
  light: "Light",
  dark: "Dark",
};

export const Tool: FC<{ api: API }> = memo(function UtilsToolbar({ api }) {
  const [globals, updateGlobals] = useGlobals();

  // Read story-level parameter defaults
  const paramGrid = useParameter<GridMode>(KEY_GRID);
  const paramScheme = useParameter<SchemeMode>(KEY_SCHEME);

  // Effective value: explicit global > story parameter > "none"
  const rawGrid: GridMode = globals[KEY_GRID] ?? "none";
  const rawScheme: SchemeMode = globals[KEY_SCHEME] ?? "none";
  const gridMode: GridMode =
    rawGrid !== "none" ? rawGrid : paramGrid ?? "none";
  const scheme: SchemeMode =
    rawScheme !== "none" ? rawScheme : paramScheme ?? "none";
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

    // Grid dropdown
    createElement(WithTooltip, {
      placement: "bottom",
      closeOnOutsideClick: true,
      tooltip: ({ onHide }: { onHide: () => void }) =>
        createElement(TooltipLinkList, {
          links: GRID_MODES.map((mode) => ({
            id: mode,
            title: gridLabels[mode],
            active: gridMode === mode,
            onClick: () => {
              setGrid(mode);
              onHide();
            },
          })),
        }),
      children: createElement(
        IconButton,
        {
          title: `Grid: ${gridLabels[gridMode]}`,
          active: gridMode !== "none",
        },
        createElement(GridIcon),
      ),
    }),

    // Scheme dropdown
    createElement(WithTooltip, {
      placement: "bottom",
      closeOnOutsideClick: true,
      tooltip: ({ onHide }: { onHide: () => void }) =>
        createElement(TooltipLinkList, {
          links: SCHEME_MODES.map((mode) => ({
            id: mode,
            title: schemeLabels[mode],
            active: scheme === mode,
            onClick: () => {
              setScheme(mode);
              onHide();
            },
          })),
        }),
      children: createElement(
        IconButton,
        {
          title: `Scheme: ${schemeLabels[scheme]}`,
          active: scheme !== "none",
        },
        createElement(ContrastIcon),
      ),
    }),

    // Baseline toggle
    createElement(
      IconButton,
      {
        title: "Toggle baseline grid",
        active: baseline,
        onClick: toggleBaseline,
      },
      createElement(RulerIcon),
    ),

    // Outlines toggle
    createElement(
      IconButton,
      {
        title: "Toggle debug outlines",
        active: outlines,
        onClick: toggleOutlines,
      },
      createElement(OutlineIcon),
    ),
  );
});
