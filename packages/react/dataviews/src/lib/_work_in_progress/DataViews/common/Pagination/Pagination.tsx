import type { ReactElement } from "react";
import { PaginationBar } from "../../../PaginationBar/index.js";
import { useDataViewsRoot } from "../../hooks/index.js";
import type { DataViewsPaginationProps } from "./types.js";

/**
 * Window navigation for the collection: the pagination bar, bound to the
 * enclosing root's provider.
 *
 * It renders exactly what `PaginationBar` renders for that provider. The one
 * difference is where the provider comes from: this part reads the root it
 * is placed in, and throws outside one, rather than taking a provider prop.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function Pagination(
  props: DataViewsPaginationProps,
): ReactElement {
  const { provider } = useDataViewsRoot("Pagination");
  return <PaginationBar {...props} provider={provider} />;
}
