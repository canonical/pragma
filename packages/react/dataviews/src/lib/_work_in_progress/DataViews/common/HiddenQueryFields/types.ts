import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import type { UseDestinationProps } from "../../hooks/index.js";

/**
 * Props of the hidden query fields of one GET form.
 *
 * Exempt from the native-prop extension convention: an internal renderer of
 * a list of hidden controls, with no root element of its own.
 */
export type HiddenQueryFieldsProps = {
  /** The provider whose applied query the destination is spelled from. */
  readonly provider: DataViewsProvider<readonly SchemaFieldDefinition[]>;
  /** The destination the form's submission reaches, from the applied state. */
  readonly destinationOf: UseDestinationProps["destinationOf"];
  /** The names the form's own visible controls submit, left out here. */
  readonly omit: readonly string[];
};
