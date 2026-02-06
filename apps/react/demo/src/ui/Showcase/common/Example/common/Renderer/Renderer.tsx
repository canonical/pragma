import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";

import { useShowcaseContext } from "../../hooks/index.js";
import rendererCss from "./styles.css?inline";

const Renderer = ({ style, className }: RendererProps) => {
  const {
    activeExample,
    demoOutput,
    activeExampleFormValues,
    showBaselineGrid,
  } = useShowcaseContext();

  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      <div style={demoOutput.css}>
        <style>{rendererCss}</style>
        <div
          className={`ds shadow-container${showBaselineGrid ? " with-baseline-grid" : ""}`}
        >
          <activeExample.Component {...activeExampleFormValues} />
        </div>
      </div>
    </div>
  );
};

export default Renderer;
