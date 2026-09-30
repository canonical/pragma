import type { ComponentProps } from "react";

/**
 * Props excluded from every tag `Head` renders.
 *
 * `key` is `Head`'s to assign, and a `key` inside a spread is a React warning.
 * `children` and `dangerouslySetInnerHTML` are illegal on a void element and
 * throw during render — on the server, that is a 500. `itemProp` opts the
 * element out of React's hoisting, which would leave the tag in the body: the
 * one thing this component exists to prevent.
 *
 * `ref` is deliberately kept. React 19 treats it as an ordinary prop, and a
 * hoisted tag is a real element in `<head>` that a ref resolves to.
 */
type ExcludedTagProps =
  | "key"
  | "children"
  | "dangerouslySetInnerHTML"
  | "itemProp";

/**
 * Attributes of a `<meta>` tag declared through `Head` — the element's own, so
 * `charSet`, `media` and the RDFa `property` an Open Graph tag needs all reach
 * the DOM.
 */
export type HeadMeta = Readonly<Omit<ComponentProps<"meta">, ExcludedTagProps>>;

/**
 * Attributes of a `<link>` tag declared through `Head` — the element's own, so
 * `as`, `hrefLang`, `integrity` and `fetchPriority` are all available.
 *
 * `rel` and `href` are required and `onLoad`/`onError` are excluded because
 * React hoists a `<link>` only when it carries both attributes and neither
 * handler; without that, the tag renders where it stands, in the body.
 */
export type HeadLink = Readonly<
  Omit<
    ComponentProps<"link">,
    ExcludedTagProps | "onLoad" | "onError" | "rel" | "href"
  > & {
    rel: string;
    href: string;
  }
>;

/**
 * Props accepted by `Head`.
 *
 * `Head` renders a fragment of hoistable tags rather than a single root
 * element, so it is exempt from the convention that a component's props extend
 * its root element's native props; the tags carry those props instead.
 */
export interface HeadProps {
  /** The page's own title, composed by the `HeadProvider` title template. */
  readonly title?: string;
  /** `<meta>` tags for this page. */
  readonly meta?: readonly HeadMeta[];
  /** `<link>` tags for this page. */
  readonly link?: readonly HeadLink[];
}
