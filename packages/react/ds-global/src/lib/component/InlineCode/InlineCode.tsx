import type React from "react";
import type { InlineCodeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds inline-code";

/**
 * This component is used to display code inline or as a standalone block.
 *
 * `import { InlineCode } from "@canonical/react-ds-global";`
 *
 * @implements dso:global.component.inline_code
 */
const InlineCode = ({
  className,
  children,
  ...props
}: InlineCodeProps): React.ReactElement => {
  return (
    <code
      className={[componentCssClassName, "code", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </code>
  );
};

export default InlineCode;
