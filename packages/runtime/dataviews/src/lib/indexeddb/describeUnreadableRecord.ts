import { RECORD_VERSION } from "./constants.js";
import readRecordFields from "./readRecordFields.js";

/** Why a stored record cannot be read as a saved view. */
export default function describeUnreadableRecord(record: unknown): string {
  const version = readRecordFields(record)?.["v"];
  return version === RECORD_VERSION
    ? "the record does not have the shape of a saved view"
    : `record version ${String(version)} is not the supported version ${RECORD_VERSION}`;
}
