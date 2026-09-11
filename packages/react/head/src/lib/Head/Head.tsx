import { type ReactElement, useContext } from "react";
import HeadContext from "../HeadProvider/Context.js";
import type { HeadLink, HeadMeta, HeadProps } from "./types.js";

/**
 * The identity of a tag, used as its React key.
 *
 * A tag's attributes are all there is to it, so they are its identity: two
 * `<meta property="og:image">` entries differ only in their `content`, and a
 * key built from the naming attribute alone would collide. The corollary is
 * that two entries carrying the same attributes are the same tag, and React
 * reports them as the duplicate they are.
 *
 * `ref` is excluded because it is a handle, not an attribute: an object ref
 * holds `null` until the element mounts and the element itself afterwards, so
 * keying on it would change the key — and serializing a mounted DOM node
 * throws on its circular structure.
 *
 * Changing an attribute therefore replaces the element rather than mutating
 * it. Nothing in `<head>` is laid out or painted, so for a `<title>` or a
 * `<meta>` that costs nothing; a `<link>` that fetches — a preload, an icon —
 * re-enters the browser's fetch path, so change one deliberately.
 */
function getTagKey({ ref: _ref, ...attributes }: HeadMeta | HeadLink): string {
  return JSON.stringify(attributes);
}

/**
 * Declare the document's `<title>`, `<meta>` and `<link>` tags.
 *
 * The tags are rendered as ordinary elements wherever the component sits in
 * the tree; React 19 hoists them into `<head>` — during server rendering as
 * well as on the client. There is no collection step and no DOM mutation, so
 * server-rendered HTML carries the page's tags in its `<head>`, and the tags
 * come and go with the component that declared them. (A `<link rel="stylesheet">`
 * with a `precedence` is the exception React makes: it becomes a resource,
 * deduplicated by `href` and left in place on unmount.)
 *
 * **One owner per document.** Only a route's leaf component may render
 * `Head`; layouts and shells must not. HTML takes the *first* `<title>` in
 * tree order and a parent renders before its children, so a layout's title
 * would beat the page's on the server. Compose a shared suffix with
 * `HeadProvider`'s `titleTemplate` instead of a second `Head`.
 *
 * **Do not let the component that renders `Head` suspend.** React can only
 * hoist a tag into a `<head>` it has already flushed. Sitting inside a
 * Suspense boundary is fine — every routed page does — but a component that
 * actually suspends during server rendering has its tags streamed in later,
 * with the rest of its markup, inside `<body>`, where a crawler reading only
 * the head will not see them. Render `Head` above whatever suspends.
 */
export default function Head({ title, meta, link }: HeadProps): ReactElement {
  const titleTemplate = useContext(HeadContext);

  return (
    <>
      {/*
        A single string child: React 19 warns when `<title>` receives an array
        or an element, so the template composes the whole title in JavaScript
        rather than interpolating several children here.
      */}
      {title === undefined ? null : <title>{titleTemplate(title)}</title>}
      {meta?.map((entry) => (
        <meta key={getTagKey(entry)} {...entry} />
      ))}
      {link?.map((entry) => (
        <link key={getTagKey(entry)} {...entry} />
      ))}
    </>
  );
}
