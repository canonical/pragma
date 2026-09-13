/** The reported reason of a thrown or rejected value, always as text. */
export default function describeError(error: unknown): string {
  try {
    return (error instanceof Error ? error.message : "") || String(error);
  } catch {
    // A value with no string form at all, such as a null-prototype object.
    return "unknown error";
  }
}
