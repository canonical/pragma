import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";

import { useConfig } from "../../hooks/index.js";
import shadowCss from "./shadow-styles.css?raw";

const Renderer = ({ style, className }: RendererProps) => {
  const { activeExample, output } = useConfig();
  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      {activeExample?.Component && (
        <>
          <h3>{activeExample.name}</h3>
          <root.div style={output.css} mode={"closed"}>
            <style>{shadowCss}</style>
            <div className="ds shadow-container">
              <activeExample.Component />
            </div>
          </root.div>
        </>
      )}
    </div>
  );
};

export default Renderer;
