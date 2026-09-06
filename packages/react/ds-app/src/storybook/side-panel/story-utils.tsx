import { type ReactNode, useCallback, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Shared Storybook helper for SidePanel stories: an iframe the panel renders
 * into, so it meets a real viewport instead of story scaffolding.
 */

/**
 * Frames a SidePanel story in an iframe of a known height.
 *
 * The panel is `position: fixed; inset-block: 0`: it is exactly as tall as the
 * viewport it renders into, and the Storybook canvas gives it no viewport to
 * speak of — the preview iframe is only as tall as the story's own content. An
 * iframe supplies a real, sized viewport, so the panel's full height becomes
 * the frame's `blockSize` no matter how short the story is.
 *
 * An iframe is its own document, so the preview's styles do not reach it: the
 * frame clones the preview document's stylesheets into its head (`frameStyles`
 * adds story-specific rules there too), and its body carries the `.surface`
 * class the panel's colour channels resolve under.
 *
 * `children` may be a function receiving the frame's body element, for stories
 * that portal more of their own into the frame — a tooltip's message, say —
 * and need it as their portal target.
 */
export const SidePanelFrame = ({
  children,
  blockSize = "30rem",
  frameStyles,
}: {
  children: ReactNode | ((frameBody: HTMLElement) => ReactNode);
  blockSize?: string;
  frameStyles?: string;
}) => {
  const [frameBody, setFrameBody] = useState<HTMLElement | null>(null);

  const mountFrame = useCallback(
    (node: HTMLIFrameElement | null) => {
      if (!node) {
        setFrameBody(null);
        return;
      }
      const doc = node.contentDocument;
      if (!doc) return;
      for (const style of document.head.querySelectorAll(
        "style, link[rel=stylesheet]",
      )) {
        doc.head.appendChild(style.cloneNode(true));
      }
      if (frameStyles) {
        const extra = doc.createElement("style");
        extra.textContent = frameStyles;
        doc.head.appendChild(extra);
      }
      doc.body.style.margin = "0";
      doc.body.classList.add("surface");
      setFrameBody(doc.body);
    },
    [frameStyles],
  );

  return (
    <>
      <iframe
        ref={mountFrame}
        title="SidePanel story frame"
        style={{ display: "block", inlineSize: "100%", blockSize, border: 0 }}
      />
      {frameBody
        ? createPortal(
            typeof children === "function" ? children(frameBody) : children,
            frameBody,
          )
        : null}
    </>
  );
};
