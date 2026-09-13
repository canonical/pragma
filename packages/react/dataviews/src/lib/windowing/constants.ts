/**
 * The key a windowing descriptor carries its implementation under. The
 * table reads it and the virtualization entry point writes it. Neither the
 * key nor what it holds is exported from the package, so no descriptor is
 * made anywhere else, and the table's own entry point imports this key
 * without ever importing the body.
 */
export const WINDOWED: unique symbol = Symbol("windowed");
