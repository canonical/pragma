import type { SchemaFieldDefinition } from "@canonical/dataviews-core";
import type { CardsProps } from "../../../Cards/index.js";

/**
 * Props of the connected cards: the cards' own, less the provider and the
 * words, which come from the enclosing root. The records are the widest shape, since the
 * root's provider may have been built over any collection; a custom cell
 * narrows them through `useDataViewsCell(collection)`.
 *
 * @experimental Pre-release: a work-in-progress spike, not admitted to the
 * package root; its shape may change or it may be withdrawn.
 */
export type DataViewsCardsProps = Omit<
  CardsProps<readonly SchemaFieldDefinition[]>,
  "provider" | "messages"
>;
