import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";
import { useShowcaseContext } from "../../hooks/index.js";
import "./styles.css";
import shadowCss from "./shadow-styles.css?inline";

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
      <div
        className={[
          "rendered-component-container",
          showBaselineGrid && "with-baseline-grid",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {activeExample?.Component && (
          <root.div style={demoOutput.css} mode={"closed"}>
            <style>{shadowCss}</style>
            <div className="ds shadow-container">
              <activeExample.Component {...activeExampleFormValues} />
            </div>
          </root.div>
        )}
      </div>
    </div>
  );
};

export default Renderer;
