import type { ReactElement } from "react";
import { ScopedDataTable } from "../../../DataTable/index.js";
import { useDataViewsRoot } from "../../hooks/index.js";
import type { DataViewsDataTableProps } from "./types.js";

/**
 * The collection's rows: the DataTable, bound to the enclosing root's
 * provider.
 *
 * It renders exactly what `DataTable` renders for that provider. The
 * difference is where the provider, the words and the announcer come from:
 * this part reads the root it is placed in, and throws outside one, rather
 * than taking a provider or messages of its own, and says what its
 * activations did through the root's one announcer rather than one of its
 * own. Its records are the widest shape: a custom cell types them through
 * `useDataViewsCell(collection)`, with the collection as its witness.
 *
 * `import { DataViews } from "@canonical/dataviews-react";`
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function DataTable(
  props: DataViewsDataTableProps,
): ReactElement {
  const { provider, messages, announce } = useDataViewsRoot("DataTable");
  return (
    <ScopedDataTable
      {...props}
      provider={provider}
      messages={messages}
      announce={announce}
    />
  );
}
