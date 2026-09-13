import type { VirtualizedBodyProps } from "../../../common/index.js";

/**
 * Props of the virtualized body row group.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's entries, not forwarding a caller's
 * native props.
 */
export type VirtualBodyProps = VirtualizedBodyProps;
