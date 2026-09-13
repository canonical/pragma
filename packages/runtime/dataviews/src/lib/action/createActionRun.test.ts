import { describe, expect, it } from "vitest";
import createActionRun from "./createActionRun.js";

describe("createActionRun", () => {
  it("requires at least one captured target", () => {
    expect(() =>
      createActionRun({ targets: [], payload: null, selectionRevision: 1 }),
    ).toThrow("at least one");
  });

  it("captures targets immutably at construction", () => {
    const targets = ["machine-1", "machine-2"];
    const payload = { action: "restart" };
    const run = createActionRun({
      targets,
      payload,
      selectionRevision: 7,
    });
    targets.push("machine-3");
    expect(run.state.targets).toEqual(["machine-1", "machine-2"]);
    // Payload is captured by reference, as documented.
    expect(run.state.payload).toBe(payload);
    expect(run.state.selectionRevision).toBe(7);
    expect(run.state.status).toBe("pending");
    expect(run.state.remaining).toEqual(["machine-1", "machine-2"]);
  });

  it("deduplicates repeated targets at construction", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    expect(run.state.targets).toEqual(["machine-1", "machine-2"]);
  });

  it("never retargets: only captured targets can receive outcomes", () => {
    const run = createActionRun({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    // The user changes selection after construction; execution stays captured.
    run.recordOutcomes([
      { target: "machine-2", status: "succeeded" },
      { target: "machine-1", status: "succeeded" },
    ]);
    expect(run.state.succeeded).toEqual(["machine-1"]);
    expect(run.state.status).toBe("succeeded");
  });

  it("keeps the snapshot when an outcome batch settles nothing", () => {
    const run = createActionRun({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    const before = run.state;
    run.recordOutcomes([{ target: "machine-9", status: "succeeded" }]);
    expect(run.state).toBe(before);
  });

  it("settles into the run a caller sees, and not before", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 0,
    });
    expect(() => run.settle()).toThrow(
      "an action run settles once every target has an outcome",
    );
    run.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(() => run.settle()).toThrow();
    run.recordOutcomes([
      { target: "machine-2", status: "failed", reason: "busy" },
    ]);
    const settled = run.settle();
    expect(settled).toEqual({
      targets: ["machine-1", "machine-2"],
      status: "failed",
      succeeded: ["machine-1"],
      failed: [{ target: "machine-2", reason: "busy" }],
    });
    expect(Object.isFrozen(settled)).toBe(true);
  });

  it("settles a target at most once per attempt", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    run.recordOutcomes([
      { target: "machine-1", status: "succeeded" },
      { target: "machine-1", status: "failed", reason: "contradiction" },
    ]);
    expect(run.state.succeeded).toEqual(["machine-1"]);
    expect(run.state.failed).toEqual([]);
  });

  it("records partial outcomes and stays partial with targets remaining", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-2", "machine-3"],
      payload: null,
      selectionRevision: 1,
    });
    run.recordOutcomes([
      { target: "machine-1", status: "succeeded" },
      { target: "machine-2", status: "failed", reason: "locked" },
    ]);
    expect(run.state.status).toBe("partial");
    expect(run.state.succeeded).toEqual(["machine-1"]);
    expect(run.state.failed).toEqual([
      { target: "machine-2", reason: "locked" },
    ]);
    expect(run.state.remaining).toEqual(["machine-3"]);
  });

  it("ends failed when every captured target failed", () => {
    const run = createActionRun({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    run.recordOutcomes([
      { target: "machine-1", status: "failed", reason: "forbidden" },
    ]);
    expect(run.state.status).toBe("failed");
    expect(run.state.remaining).toEqual([]);
  });

  it("ends succeeded when every captured target succeeded", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    run.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(run.state.status).toBe("partial");
    run.recordOutcomes([{ target: "machine-2", status: "succeeded" }]);
    expect(run.state.status).toBe("succeeded");
    expect(run.state.failed).toEqual([]);
  });

  it("records multiple failures in one partial result", () => {
    const run = createActionRun({
      targets: ["machine-1", "machine-2"],
      payload: null,
      selectionRevision: 1,
    });
    run.recordOutcomes([
      { target: "machine-1", status: "failed", reason: "locked" },
      { target: "machine-2", status: "failed", reason: "offline" },
    ]);
    expect(run.state.failed).toEqual([
      { target: "machine-1", reason: "locked" },
      { target: "machine-2", reason: "offline" },
    ]);
    expect(run.state.status).toBe("failed");
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const run = createActionRun({
      targets: ["machine-1"],
      payload: null,
      selectionRevision: 1,
    });
    const first = run.state;
    expect(run.state).toBe(first);
    run.recordOutcomes([{ target: "machine-1", status: "succeeded" }]);
    expect(run.state).not.toBe(first);
  });
});
