import type { ReactElement } from "react";
import { useContext } from "react";
import PaginationBar from "../../../PaginationBar/PaginationBar.js";
import DataViewsContext from "../../Context.js";
import type { PaginationProps } from "./types.js";

/**
 * Window navigation for the collection: the pagination bar, bound to the
 * enclosing root's provider.
 *
 * It renders exactly what `PaginationBar` renders for that provider. The one
 * difference is where the provider comes from: this part reads the root it
 * is placed in, and throws outside one, rather than taking a provider prop.
 */
export default function Pagination(props: PaginationProps): ReactElement {
  const provider = useContext(DataViewsContext);
  if (provider === null) {
    throw new Error(
      "DataViews.Pagination must be used inside a DataViews root",
    );
  }
  return <PaginationBar {...props} provider={provider} />;
}
