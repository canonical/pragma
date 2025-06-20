import React, { memo } from "react";
import { AddonPanel, SyntaxHighlighter } from "storybook/internal/components";
import {
  type API,
  useParameter,
  useStorybookState,
} from "storybook/internal/manager-api";
import { PARAM_KEY } from "../constants.js";
import type { MswParameter } from "../types.js";

interface PanelProps {
  api: API;
  active?: boolean;
}

export const Panel = memo(function MswPanel({ api, active }: PanelProps) {
  const state = useStorybookState();
  const parameter = useParameter<MswParameter>(PARAM_KEY);

  if (!active || !parameter?.handlers) {
    return null;
  }

  // Extract handler information for display
  // MSW handlers have an info property that contains request, resolver, and options
  const handlerInfo = parameter.handlers.map((handler, index) => {
    // The handler info structure in MSW v2 is different
    // We'll extract what we can from the handler
    const info = handler.info;

    // Try to extract meaningful information
    // In MSW v2, handlers have a request property that might contain the predicate
    return {
      index,
      // We'll use a generic description since MSW doesn't expose method/path directly
      type: info?.header ? "HTTP Handler" : "Unknown Handler",
      // You could potentially inspect the handler's toString() or other properties
      description: `Handler ${index + 1}`,
    };
  });

  return (
    <AddonPanel active={active}>
      <div style={{ padding: "1rem" }}>
        <h3>Active MSW Handlers</h3>
        <p style={{ marginBottom: "1rem", opacity: 0.7 }}>
          {parameter.handlers.length} handler
          {parameter.handlers.length !== 1 ? "s" : ""} registered
        </p>
        <SyntaxHighlighter language="json">
          {JSON.stringify(handlerInfo, null, 2)}
        </SyntaxHighlighter>
      </div>
    </AddonPanel>
  );
});
