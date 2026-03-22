import { type Channel, VALID_CHANNELS } from "#constants";
import { PragmaError } from "#error";

/**
 * Validate that a string is one of the accepted channel values.
 *
 * @param value - The channel string to validate.
 * @returns The validated Channel value.
 * @throws PragmaError.invalidInput if the value is not a valid channel.
 */
export default function validateChannel(value: string): Channel {
  if (VALID_CHANNELS.includes(value as Channel)) {
    return value as Channel;
  }

  throw PragmaError.invalidInput("channel", value, {
    validOptions: [...VALID_CHANNELS],
  });
}
