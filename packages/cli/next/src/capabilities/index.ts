/**
 * The capability registry: the literal array of every capability module the
 * projectors consume (D8 — test-only fixtures are never listed here).
 *
 * The order is the authoring order; projectors sort where they need to. PR1
 * ships `info` + `config show` as real verbs and the hidden `meta` verbs
 * (`__complete`, `mcp`). Importing this barrel pulls only spec + formatter
 * modules — every run body is behind a lazy dynamic import — so the
 * `--help`/`__complete` fast paths stay free of the config reader and zod.
 */

import type { CapabilityModule } from "../kernel/spec/types.js";
import { blockModule } from "./block/index.js";
import { configModule } from "./config/index.js";
import { createModule } from "./create/index.js";
import { graphModule } from "./graph/index.js";
import { infoModule } from "./info/index.js";
import { metaModule } from "./meta/index.js";
import { modifierModule } from "./modifier/index.js";
import { ontologyModule } from "./ontology/index.js";
import { skillModule } from "./skill/index.js";
import { sourcesModule } from "./sources/index.js";
import { standardModule } from "./standard/index.js";
import { tierModule } from "./tier/index.js";
import { tokenModule } from "./token/index.js";

/** Every capability module, in authoring order. */
export const capabilities: readonly CapabilityModule[] = [
  infoModule,
  configModule,
  createModule,
  sourcesModule,
  standardModule,
  tierModule,
  modifierModule,
  tokenModule,
  blockModule,
  ontologyModule,
  skillModule,
  graphModule,
  metaModule,
];
