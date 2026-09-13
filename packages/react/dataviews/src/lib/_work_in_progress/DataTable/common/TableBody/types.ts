import type { BodyProps } from "../../../../common/index.js";

/**
 * Props of the table's body row group: the entries, and the table's own
 * renderer of one.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's entries, not forwarding a caller's
 * native props.
 */
export type TableBodyProps = BodyProps;
