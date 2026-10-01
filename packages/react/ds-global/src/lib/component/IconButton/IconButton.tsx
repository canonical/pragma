import type React from "react";
import { Button } from "../Button/index.js";
import type Props from "./types.js";
import "./styles.css";

const componentCssClassName = "icon-button";

/**
 * A square, icon-only Button. It renders `Button` — so importance,
 * anticipation, loading, disabled and the density seat all come from Button —
 * and only makes the box square around a centred icon, with its baseline
 * seated where a labelled Button's label baseline sits.
 *
 * Pair it with a Tooltip that states the action, and name it with
 * `aria-label` or `aria-labelledby`.
 *
 * `import { IconButton } from "@canonical/react-ds-global";`
 */
const IconButton = ({
  className,
  icon,
  ...props
}: Props): React.ReactElement => (
  <Button
    {...props}
    icon={icon}
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
  />
);

export default IconButton;
