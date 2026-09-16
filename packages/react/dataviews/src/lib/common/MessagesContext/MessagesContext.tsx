import type { DataViewsMessages } from "@canonical/dataviews-core";
import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { createContext } from "react";

/**
 * React context carrying the words a table speaks. A root resolves the
 * application's `messages` over English once, with `useMessages`, and
 * installs the result here over its private cells and menus, so a row's
 * checkbox or a column's menu reads the same words without every renderer
 * between passing them on. Parts an application renders itself take their
 * words from their own root, never from here. English where
 * nothing installed it: a private part rendered alone in a test. Resolved
 * rather than the core record itself, so a test that swaps the words where
 * every part resolves them swaps this default too.
 */
const MessagesContext = createContext<DataViewsMessages>(resolveMessages());

export default MessagesContext;
