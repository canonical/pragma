import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";
import root from "react-shadow";

import { TypographicSpecimen } from "../examples/index.js";
import shadowCss from "./shadow-styles.css?raw";

const Renderer = ({ style, className }: RendererProps) => {
  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      {
        <>
          <h3>Typographic specimen</h3>
          <root.div style={{}} mode={"closed"}>
            <style>{shadowCss}</style>
            <div className="ds shadow-container">
              <TypographicSpecimen />
            </div>
          </root.div>
        </>
      }
    </div>
  );
};

export default Renderer;
