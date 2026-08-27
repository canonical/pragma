/**
 * Authored messages of the `create` surface that the BIN needs on its parse
 * error path — imported (lazily) by `handleProgramError`, authored here so
 * the kernel carries no create-domain literal.
 */

import { BIN_NAME } from "../../constants.js";
import { COMPONENT_FRAMEWORKS } from "./constants.js";

/**
 * The R1 death of the old grammar: `--framework` is not a flag any more, and
 * a parse failure whose argv still carries it gets THIS message (exit 2),
 * naming the new form — no shim, no silent rebinding.
 */
export const FRAMEWORK_FLAG_ERROR =
  "error: unknown option '--framework' — the framework is now a path segment: " +
  `\`${BIN_NAME} create component <${COMPONENT_FRAMEWORKS.join("|")}> [component-path]\` ` +
  "(create mirrors summon).";
