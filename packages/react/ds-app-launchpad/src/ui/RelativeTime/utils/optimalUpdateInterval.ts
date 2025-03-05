import { Temporal } from "@js-temporal/polyfill";
import { CONSTANTS } from "./index.js";

/**
 * Calcualte the optimal update interval for a given instant based on the time distance from now.
 * @returns The optimal update interval in milliseconds.
 */
function optimalUpdateInterval(instant: Temporal.Instant): number {
  const now = Temporal.Now.instant();
  const deltaSeconds = instant.epochSeconds - now.epochSeconds;
  const absDeltaSeconds = Math.abs(deltaSeconds);

  if (absDeltaSeconds < CONSTANTS.MINUTE_IN_SECONDS) {
    return 1000;
  }

  if (absDeltaSeconds < CONSTANTS.HOUR_IN_SECONDS) {
    return CONSTANTS.MINUTE_IN_SECONDS * 1000;
  }

  if (absDeltaSeconds < CONSTANTS.DAY_IN_SECONDS) {
    return CONSTANTS.HOUR_IN_SECONDS * 1000;
  }
  // for any other time distance, update once a day
  return CONSTANTS.DAY_IN_SECONDS * 1000;
}

export default optimalUpdateInterval;
