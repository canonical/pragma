import { expect } from "vitest";

/**
 * Assert that an MCP tool response's `data` field is deeply equal
 * to the operation result that CLI would produce.
 *
 * Unwraps the MCP response envelope and deep-compares `data` against
 * the raw operation result. Fails with a clear diff on mismatch.
 *
 * @param operationResult - The raw result from calling the shared operation.
 * @param mcpResponse - The raw MCP `CallToolResult` from `client.callTool()`.
 * @throws When the envelope is not `ok: true` or `data` does not match.
 */
export default function assertParity(
  operationResult: unknown,
  mcpResponse: Record<string, unknown>,
): void {
  const content = mcpResponse.content as unknown[];
  const first = content[0] as { type: string; text: string };
  expect(first.type).toBe("text");

  const envelope = JSON.parse(first.text) as {
    ok: boolean;
    data?: unknown;
  };
  expect(envelope.ok).toBe(true);
  expect(envelope.data).toEqual(operationResult);
}
