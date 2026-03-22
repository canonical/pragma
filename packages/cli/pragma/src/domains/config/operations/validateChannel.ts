/**
 * Validate a channel value.
 */

import { type Channel, VALID_CHANNELS } from "#constants";
import { PragmaError } from "#error";

/**
 * Validate a channel value.
 *
 * @throws PragmaError.invalidInput if the channel is not one of the three valid values.
 */
export default function validateChannel(value: string): Channel {
  if (VALID_CHANNELS.includes(value as Channel)) {
    return value as Channel;
  }

  throw PragmaError.invalidInput("channel", value, {
    validOptions: [...VALID_CHANNELS],
  });
}
