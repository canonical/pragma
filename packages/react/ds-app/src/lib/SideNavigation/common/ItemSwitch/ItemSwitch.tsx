import { Icon } from "@canonical/react-ds-global";
import { SwitchInput } from "@canonical/react-ds-global-form";
import type React from "react";
import { useCallback } from "react";
import type { ItemSwitchProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-navigation-item-switch";

/**
 * SideNavigation.ItemSwitch — a navigation row that toggles a setting
 * instead of navigating. One of the `control` variants selectable on a
 * `LeafNavItem` (SPEC.md §4.4) — the others are Item (link, the default)
 * and ItemButton. The row is a `<label>` wrapping the switch, so activating
 * anywhere on the row toggles it (native label-wraps-input association —
 * no `id`/`htmlFor` bookkeeping needed). Content is composed via
 * `children`, matching `Button`'s own convention.
 *
 * @implements ds:apps.subcomponent.side-navigation-item-switch
 */
const ItemSwitch = ({
  children,
  icon,
  disabled = false,
  checked,
  defaultChecked,
  onCheckedChange,
  className,
  key: _key,
  ...props
}: ItemSwitchProps): React.ReactElement => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.currentTarget.checked);
    },
    [onCheckedChange],
  );

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      {...props}
    >
      {/* biome-ignore lint/a11y/noLabelWithoutControl: SwitchInput renders the actual <input> — biome's static check can't see through the component boundary to the control it wraps. */}
      <label className="row">
        {/* Start cell is always rendered (empty when no icon), matching
            Item, so content stays aligned whether or not a row has an icon. */}
        <span className="start p">
          {icon ? <Icon width={16} height={16} icon={icon} /> : null}
        </span>
        {/* `title` — native tooltip fallback for truncated text; SPEC.md §10.17. */}
        <span
          className="label p"
          title={typeof children === "string" ? children : undefined}
        >
          {children}
        </span>
        <span className="end">
          <SwitchInput
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            onChange={handleChange}
          />
        </span>
      </label>
    </li>
  );
};

export default ItemSwitch;
