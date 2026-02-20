import type React from "react";
import type { SkipLinkProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds skip-link";

/**
 * The `SkipLink` component provides a way for users to quickly navigate to the main content of a page.
 * It is typically used by keyboard and screen reader users to bypass repetitive navigation links
 * and other elements that appear at the top of the page, pursuant to [WCAG 2.1 Success Criterion 2.4.1](https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html).
 *
 * `SkipLink` should be placed near the top of your document body, before the `<main>` element.
 * The `<main>` element should have a `tabindex` of `-1` to prevent it from receiving focus from the keyboard without using the skip link.
 *
 * @implements ds:site.pattern.skip_link
 */
const SkipLink = ({
  className,
  children,
  mainId = "main",
  ...props
}: SkipLinkProps): React.ReactElement => {
  const href = `#${mainId}`;
  const skipLinkContents = children || "Skip to main content";

  return (
    <a
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      href={href}
      tabIndex={0}
      {...props}
    >
      {skipLinkContents}
    </a>
  );
};

export default SkipLink;
