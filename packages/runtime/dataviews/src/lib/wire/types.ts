/**
 * Wire-grammar contracts: what an encode writes and what a decode returns,
 * including the owned parameters it rejected.
 */

import type { ResultWindow, Slice } from "../query/types.js";
import type { Schema } from "../schema/createSchema.js";
import type { SchemaFieldDefinition } from "../schema/types.js";
import type { SourceCapabilities } from "../source/types.js";

/**
 * One refusal of an owned parameter — by the grammar, the schema or the
 * source — named for a visible query error. One parameter may carry
 * several.
 */
export type QueryIssue = {
  /** The parameter as it was spelled in the URL. */
  readonly parameter: string;
  /** Why it was refused: a lowercase fragment, as schema reasons are. */
  readonly reason: string;
};

/**
 * What one parameter set decodes to. A refused clause is left out of the
 * query and reported: the slice is what could be read, the issues are what
 * could not.
 */
export type DecodedQuery = {
  readonly slice: Slice;
  readonly window: ResultWindow;
  /**
   * Every owned parameter refused — grammar and schema refusals in
   * parameter order, then the source's.
   */
  readonly issues: readonly QueryIssue[];
};

/** Configuration of one query encode. */
export type EncodeQueryConfig = {
  /** The schema whose field addresses the encode owns. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  readonly slice: Slice;
  readonly window: ResultWindow;
  /**
   * Parameters to carry through. The grammar's own keys are replaced; every
   * other parameter survives in its original order, duplicates included.
   */
  readonly preserve?: URLSearchParams;
};

/** Configuration of one query decode. */
export type DecodeQueryConfig = {
  /** The schema supplying field kinds, typed parsing and legal operators. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  readonly params: URLSearchParams;
  /**
   * What the source declares it can execute. A clause outside it is refused
   * like a malformed one, so an unexecutable link never becomes the query.
   * Omitted or null, only the grammar and the schema are checked.
   */
  readonly capabilities?: SourceCapabilities | null;
};
