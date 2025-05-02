import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";
import { useShowcaseContext } from "../../hooks/index.js";
import shadowCss from "./styles.css?inline";

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
      {activeExample?.Component && (
        <root.div style={demoOutput.css} mode={"closed"}>
          <style>{shadowCss}</style>
          <div
            className={`ds shadow-container${showBaselineGrid ? " with-baseline-grid" : ""}`}
          >
            <activeExample.Component {...activeExampleFormValues} />
          </div>
        </root.div>
      )}
    </div>
  );
};

export default Renderer;
