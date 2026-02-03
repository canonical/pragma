import type { RendererProps } from "./types.js";

const componentCssClassname = "ds example-renderer";

import { useShowcaseContext } from "../../hooks/index.js";

const Renderer = ({ style, className }: RendererProps) => {
  const {
    activeExample,
    activeExampleFormValues,
  } = useShowcaseContext();

  return (
    <div
      style={style}
      className={[componentCssClassname, className].filter(Boolean).join(" ")}
    >
      <activeExample.Component {...activeExampleFormValues} />
    </div>
  );
};

export default Renderer;
