import type { RunTaskOptions } from "@canonical/task";
import type StampConfig from "../types/StampConfig.js";

export interface RunTaskWithStampOptions extends RunTaskOptions {
  /** Stamp configuration for generated files. If provided, all written files get a stamp comment. */
  stamp?: StampConfig;
}
