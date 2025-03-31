import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";

import { useWatch } from "react-hook-form";
import { toGlobalFormStateKey } from "utils/index.js";
import { useConfig } from "../../hooks/index.js";
import shadowCss from "./shadow-styles.css?raw";

const Renderer = ({ style, className }: RendererProps) => {
  const { activeExample, output } = useConfig();
  const { [toGlobalFormStateKey(activeExample.name)]: componentConfigState } =
    useWatch();

  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      <h4>{activeExample.name}</h4>
      <p>{activeExample.description}</p>
      {activeExample?.Component && (
        <root.div style={output.css} mode={"closed"}>
          <style>{shadowCss}</style>
          <div className="ds shadow-container">
            <activeExample.Component {...componentConfigState} />
          </div>
        </root.div>
      )}
    </div>
  );
};

export default Renderer;
