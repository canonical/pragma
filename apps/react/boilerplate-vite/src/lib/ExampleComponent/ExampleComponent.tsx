/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ExampleComponentProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds example-component";

/**
 * description of the ExampleComponent component
 * @returns {React.ReactElement} - Rendered ExampleComponent
 */
const ExampleComponent = ({
  id,
  children,
  className,
  style,
}: ExampleComponentProps): React.ReactElement => {
  return (
    <div
      id={id}
      style={style}
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
};

export default ExampleComponent;
