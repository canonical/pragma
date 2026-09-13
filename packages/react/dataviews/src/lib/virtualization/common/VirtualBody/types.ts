import type { WindowedBodyProps } from "../../../DataTable/index.js";

/**
 * Props of the windowed body row group.
 *
 * Exempt from the native-prop extension convention: an internal renderer
 * deriving its root from the table's entries, not forwarding a caller's
 * native props.
 */
export type VirtualBodyProps<TRow extends object> = WindowedBodyProps<TRow>;
