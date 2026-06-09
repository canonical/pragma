import type React from "react";
import { LOREM_PARAGRAPHS } from "./constants.js";
import type { LoremProps } from "./types.js";

const componentCssClassName = "ds lorem";

/**
 * Renders filler lorem ipsum paragraphs — used to populate story layouts, such
 * as a scrolling page-content area beside a navigation. Renders `paragraphs`
 * `<p>` elements, cycling through the fixture when the count exceeds it.
 */
const Lorem = ({
  paragraphs = 3,
  className,
  ...props
}: LoremProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {Array.from({ length: Math.max(0, paragraphs) }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static, stable filler
        <p key={i}>{LOREM_PARAGRAPHS[i % LOREM_PARAGRAPHS.length]}</p>
      ))}
    </div>
  );
};

export default Lorem;
