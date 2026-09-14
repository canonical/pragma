/**
 * The IndexedDB store's constants: the database and record versions it
 * creates and reads, the two object stores, and the preference target
 * pins are kept under.
 */

/** The database schema this store creates. Version 1 is the first. */
export const DATABASE_VERSION = 1;

/** The saved-view record format this store reads and writes. */
export const RECORD_VERSION = 1;

/** The object store holding saved views, keyed by scope and id. */
export const VIEWS = "views";

/** The object store holding preferences, keyed by scope, target and key. */
export const PREFERENCES = "preferences";

/** The preference target pins are kept under; presentation has its own targets. */
export const PINS = "pins";
