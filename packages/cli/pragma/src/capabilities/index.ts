/**
 * The capability registry: every capability module the projectors consume
 * (D8 — test-only fixtures are never listed here).
 *
 * Two sources, in this order: the literal array of AUTHORED modules (in
 * authoring order; projectors sort where they need to), then every story
 * `pragma.conf.ts` declares that no authored module already claims. A noun with
 * hand-written code appears in the authored array and composes its story there
 * (`block`, `tier`); a noun that is purely declarative appears only in
 * the config. No noun literal is written here — the second half is derived.
 *
 * Importing this barrel pulls only spec + formatter modules — every run body is
 * behind a lazy dynamic import, and `distribution.ts` is zod-free — so the
 * `--help`/`__complete` fast paths stay free of the config reader and zod.
 */

import type { CapabilityModule } from "../kernel/spec/types.js";
import { blockModule } from "./block/index.js";
import { capabilitiesModule } from "./capabilities/index.js";
import { colophonModule } from "./colophon/index.js";
import { configModule } from "./config/index.js";
import { createModule } from "./create/index.js";
import { storyModules } from "./distribution.js";
import { doctorModule } from "./doctor/index.js";
import { graphModule } from "./graph/index.js";
import { infoModule } from "./info/index.js";
import { metaModule } from "./meta/index.js";
import { ontologyModule } from "./ontology/index.js";
import { promptModule } from "./prompt/index.js";
import { setupModule } from "./setup/index.js";
import { skillModule } from "./skill/index.js";
import { sourcesModule } from "./sources/index.js";
import { tierModule } from "./tier/index.js";
import { upgradeModule } from "./upgrade/index.js";

/** The modules with hand-written code, in authoring order. */
const authored: readonly CapabilityModule[] = [
  infoModule,
  configModule,
  createModule,
  sourcesModule,
  tierModule,
  blockModule,
  ontologyModule,
  skillModule,
  graphModule,
  promptModule,
  doctorModule,
  upgradeModule,
  setupModule,
  capabilitiesModule,
  colophonModule,
  metaModule,
];

const claimed = new Set(authored.map((module) => module.name));

/** Every capability module: the authored ones, then the unclaimed declared stories. */
export const capabilities: readonly CapabilityModule[] = [
  ...authored,
  ...[...storyModules.values()].filter((module) => !claimed.has(module.name)),
];
