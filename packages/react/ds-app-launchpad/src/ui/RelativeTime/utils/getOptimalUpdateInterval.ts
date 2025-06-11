import { Temporal } from "@js-temporal/polyfill";
import * as constants from "./constants.js";

/**
 * Calcualte the optimal update interval for a given instant based on the time distance from now.
 * @returns The optimal update interval in milliseconds.
 */
function getOptimalUpdateInterval(instant: Temporal.Instant): number {
  const now = Temporal.Now.instant();
  const deltaSeconds =
    (instant.epochMilliseconds - now.epochMilliseconds) / 1000;
  const absDeltaSeconds = Math.abs(deltaSeconds);

  if (absDeltaSeconds < constants.MINUTE_IN_SECONDS) {
    return 1000;
  }

  if (absDeltaSeconds < constants.HOUR_IN_SECONDS) {
    return constants.MINUTE_IN_SECONDS * 1000;
  }

  if (absDeltaSeconds < constants.DAY_IN_SECONDS) {
    return constants.HOUR_IN_SECONDS * 1000;
  }
  // for any other time distance, update once a day
  return constants.DAY_IN_SECONDS * 1000;
}

export default getOptimalUpdateInterval;
