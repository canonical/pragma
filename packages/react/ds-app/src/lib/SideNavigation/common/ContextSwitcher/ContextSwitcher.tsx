import { Icon, Popover } from "@canonical/react-ds-global";
import type React from "react";
import type { ContextSwitcherProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-context-switcher";

/**
 * SideNavigation.ContextSwitcher — a dropdown for products that divide into
 * different contexts, projects, users, or similar (SPEC.md §4.3, §4.5).
 * Renders via Popover, which is itself `<details>`/`<summary>`-based, so the
 * disclosure works without JavaScript; positioning and outside-click/Escape
 * dismissal are layered on once hydrated (same contract as Popover itself).
 *
 * Not currently part of the `NavRoot`/`NavGroup` content-tree data model —
 * SPEC.md §4.5's "content-defined position" is realised by composing this
 * component directly where the consumer wants it (e.g. via
 * `SideNavigation.Content`'s `children` fallback), not by a `root.items`
 * entry kind. See SPEC.md's known issues for the rationale.
 *
 * @implements ds:apps.subcomponent.side-navigation-context-switcher
 */
const ContextSwitcher = ({
  currentContext,
  contexts,
  onContextChange,
  onCreateContext,
  createContextLabel = "Create context",
  className,
  ...props
}: ContextSwitcherProps): React.ReactElement => (
  <Popover
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    trigger={
      <span className="row">
        <span className="label p">{currentContext.name}</span>
        <Icon icon="chevron-down" className="end caret" />
      </span>
    }
    {...props}
  >
    <ul className="list">
      {contexts.map((context) => (
        <li key={context.key}>
          <button
            type="button"
            className="context-item"
            data-current={context.key === currentContext.key || undefined}
            onClick={() => onContextChange?.(context)}
          >
            <span className="name">{context.name}</span>
            {context.description ? (
              <span className="description">{context.description}</span>
            ) : null}
            {context.badge ? (
              <span className="badge">{context.badge}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
    {onCreateContext ? (
      <button
        type="button"
        className="create-context"
        onClick={onCreateContext}
      >
        {createContextLabel}
      </button>
    ) : null}
  </Popover>
);

export default ContextSwitcher;
