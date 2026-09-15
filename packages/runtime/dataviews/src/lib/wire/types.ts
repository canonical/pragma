/**
 * Wire-grammar contracts: what an encode writes and what a decode returns,
 * including the owned parameters it rejected.
 */

import type { Query, ResultWindow, Slice } from "../query/index.js";
import type { SourceRefusalCode } from "../result/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import type { SourceCapabilities } from "../source/index.js";

/**
 * A column arrangement as parameters carry it where no script keeps it: the
 * column order, or null where the parameters carry none, and the hidden
 * columns, each a list of column ids.
 */
export type ArrangementParams = {
  readonly order: readonly string[] | null;
  readonly hidden: readonly string[];
};

/**
 * Which stage refused a parameter, for a control to switch on: the
 * source's own code where the source refused it, `malformed` where the
 * grammar could not read it, `invalid` where the schema refused its value or
 * its operator, and `unknown-field` where it names a field the collection
 * does not have.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type QueryIssueCode =
  | SourceRefusalCode
  | "malformed"
  | "invalid"
  | "unknown-field";

/**
 * One refusal of an owned parameter — by the grammar, the schema or the
 * source — named for a visible query error. One parameter may carry
 * several. The code names the stage that refused it, and the reason is what
 * a control says.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type QueryIssue = {
  /** The parameter as it was spelled in the URL. */
  readonly parameter: string;
  /** Which stage refused it, for a control to switch on. */
  readonly code: QueryIssueCode;
  /** Why it was refused: a lowercase fragment, as schema reasons are. */
  readonly reason: string;
};

/**
 * What one parameter set decodes to. A refused clause is left out of the
 * query and reported: the slice is what could be read, the issues are what
 * could not.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DecodedQuery = Query & {
  /**
   * Every owned parameter refused — grammar and schema refusals in
   * parameter order, then the source's.
   */
  readonly issues: readonly QueryIssue[];
};

/**
 * Configuration of one query encode.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type EncodeQueryConfig = {
  /** The schema whose field addresses the encode owns. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  readonly slice: Slice;
  /**
   * The window to write, or null to write the query alone — no `page` or
   * `size` — as a saved view stores it.
   */
  readonly window: ResultWindow | null;
  /**
   * Parameters to carry through. The grammar's own keys are replaced; every
   * other parameter survives in its original order, duplicates included.
   */
  readonly preserve?: URLSearchParams | undefined;
};

/**
 * Configuration of one query decode.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DecodeQueryConfig = {
  /** The schema supplying field kinds, typed parsing and legal operators. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  readonly params: URLSearchParams;
  /**
   * What the source declares it can execute. A clause outside it is refused
   * like a malformed one, so an unexecutable link never becomes the query.
   * Omitted or null, only the grammar and the schema are checked.
   */
  readonly capabilities?: SourceCapabilities | null | undefined;
};
