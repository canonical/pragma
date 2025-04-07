import type { RendererProps } from "./types.js";
const componentCssClassname = "ds example-renderer";
import root from "react-shadow";
import { useShowcaseContext } from "../../hooks/index.js";
import shadowCss from "./shadow-styles.css?inline";

const Renderer = ({ style, className }: RendererProps) => {
  const { activeExample, output, activeExampleFormValues } =
    useShowcaseContext();

  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      <h3>{activeExample.name}</h3>
      <p>{activeExample.description}</p>
      {activeExample?.Component && (
        <root.div style={output.css} mode={"closed"}>
          <style>{shadowCss}</style>
          <div className="ds shadow-container">
            <activeExample.Component {...activeExampleFormValues} />
          </div>
        </root.div>
      )}
    </div>
  );
};

export default Renderer;
