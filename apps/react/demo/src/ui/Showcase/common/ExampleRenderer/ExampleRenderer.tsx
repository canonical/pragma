import type { ExampleRendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";

import { useConfig } from "../ExampleControls/Context.js";
import shadowCss from "./shadow-styles.css?raw";

const ExampleRenderer = ({ style, className }: ExampleRendererProps) => {
  const { activeExample } = useConfig();
  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      {activeExample?.component && (
        <>
          <h3>{activeExample.name}</h3>
          <root.div style={activeExample.cssVars} mode={"closed"}>
            <style>{shadowCss}</style>
            <div className="ds shadow-container">
              <activeExample.component />
            </div>
          </root.div>
        </>
      )}
    </div>
  );
};

export default ExampleRenderer;
