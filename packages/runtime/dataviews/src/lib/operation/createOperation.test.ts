import { describe, expect, it } from "vitest";
import createOperation from "./createOperation.js";

describe("createOperation", () => {
  it("requires at least one captured target", () => {
    expect(() =>
      createOperation({ targets: [], payload: null, selectionRevision: 1 }),
    ).toThrow("at least one");
  });

  it("captures targets immutably at construction", () => {
    const targets = ["machine-1", "machine-2"];
    const payload = { action: "restart" };
    const operation = createOperation({
      targets,
      payload,
      selectionRevision: 7,
    });
    targets.push("machine-3");
    expect(operation.state.targets).toEqual(["machine-1", "machine-2"]);
    // Payload is captured by reference, as documented.
    expect(operation.state.payload).toBe(payload);
    expect(operation.state.selectionRevision).toBe(7);
    expect(operation.state.status).toBe("pending");
    expect(operation.state.remaining).toEqual(["machine-1", "machine-2"]);
  });

  it("deduplicates repeated targets at construction", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    expect(operation.state.targets).toEqual(["machine-1", "machine-2"]);
  });

  it("never retargets: only captured targets can receive outcomes", () => {
    const operation = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    // The user changes selection after construction; execution stays captured.
    operation.recordOutcomes([
      { target: "machine-2", status: "succeeded" },
      { target: "machine-1", status: "succeeded" },
    ]);
    expect(operation.state.succeeded).toEqual(["machine-1"]);
    expect(operation.state.status).toBe("succeeded");
  });

  it("keeps the snapshot when an outcome batch settles nothing", () => {
    const operation = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    const before = operation.state;
    operation.recordOutcomes([{ target: "machine-9", status: "succeeded" }]);
    expect(operation.state).toBe(before);
  });

  it("settles a target at most once per attempt", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([
      { target: "machine-1", status: "succeeded" },
      { target: "machine-1", status: "failed", reason: "contradiction" },
    ]);
    expect(operation.state.succeeded).toEqual(["machine-1"]);
    expect(operation.state.failed).toEqual([]);
  });

  it("records partial outcomes and stays partial with targets remaining", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2", "machine-3"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([
      { target: "machine-1", status: "succeeded" },
      { target: "machine-2", status: "failed", reason: "locked" },
    ]);
    expect(operation.state.status).toBe("partial");
    expect(operation.state.succeeded).toEqual(["machine-1"]);
    expect(operation.state.failed).toEqual([
      { target: "machine-2", reason: "locked" },
    ]);
    expect(operation.state.remaining).toEqual(["machine-3"]);
  });

  it("ends failed when every captured target failed", () => {
    const operation = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([
      { target: "machine-1", status: "failed", reason: "forbidden" },
    ]);
    expect(operation.state.status).toBe("failed");
    expect(operation.state.remaining).toEqual([]);
  });

  it("ends succeeded when every captured target succeeded", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(operation.state.status).toBe("partial");
    operation.recordOutcomes([{ target: "machine-2", status: "succeeded" }]);
    expect(operation.state.status).toBe("succeeded");
    expect(operation.state.failed).toEqual([]);
  });

  it("records multiple failures in one partial result", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([
      { target: "machine-1", status: "failed", reason: "locked" },
      { target: "machine-2", status: "failed", reason: "offline" },
    ]);
    expect(operation.state.failed).toEqual([
      { target: "machine-1", reason: "locked" },
      { target: "machine-2", reason: "offline" },
    ]);
    expect(operation.state.status).toBe("failed");
  });

  it("retries only the failed captured targets under the same identity", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 3,
    });
    operation.recordOutcomes([
      { target: "machine-1", status: "succeeded" },
      { target: "machine-2", status: "failed", reason: "timeout" },
    ]);
    const identityBefore = operation.identity;
    operation.retry();
    expect(operation.identity).toBe(identityBefore);
    // The original capture stays on the record for reporting.
    expect(operation.state.targets).toEqual(["machine-1", "machine-2"]);
    expect(operation.state.remaining).toEqual(["machine-2"]);
    expect(operation.state.status).toBe("pending");
    expect(operation.state.attempts).toBe(2);
    expect(operation.state.succeeded).toEqual([]);
    expect(operation.state.failed).toEqual([]);
  });

  it("ignores an outcome for an already-settled target after retry", () => {
    const operation = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    operation.recordOutcomes([
      { target: "machine-2", status: "failed", reason: "timeout" },
    ]);
    operation.retry();
    operation.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(operation.state.succeeded).toEqual([]);
    expect(operation.state.remaining).toEqual(["machine-2"]);
  });

  it("ignores retry when nothing failed", () => {
    const operation = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    operation.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    operation.retry();
    expect(operation.state.status).toBe("succeeded");
    expect(operation.state.attempts).toBe(1);
  });

  it("ignores retry while pending or partial", () => {
    const pending = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    pending.retry();
    expect(pending.state.attempts).toBe(1);

    const partial = createOperation({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    partial.recordOutcomes([
      { target: "machine-1", status: "failed", reason: "locked" },
    ]);
    partial.retry();
    expect(partial.state.status).toBe("partial");
    expect(partial.state.attempts).toBe(1);
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const operation = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    const first = operation.state;
    expect(operation.state).toBe(first);
    operation.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(operation.state).not.toBe(first);
  });

  it("keeps a stable identity per invocation", () => {
    const a = createOperation({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 0,
    });
    const b = createOperation({
      targets: ["machine-2"],
      payload: null,
      selectionRevision: 0,
    });
    expect(a.identity).not.toBe(b.identity);
  });
});
