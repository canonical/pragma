import { describe, expect, it, vi } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import type { Predicate, PredicateOperator } from "../query/index.js";
import type { SourceRefusal } from "../result/index.js";
import createFilterInput from "./createFilterInput.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "cpu", kind: "number", min: 0, max: 64 },
    { field: "status", kind: "choices", options: ["failed", "ready"] },
    { field: "owner", kind: "flag" },
  ],
});

const refusal: SourceRefusal = {
  part: "filter",
  code: "undeclared-field",
  field: "cpu",
  operator: "gte",
  reason: 'field "cpu" cannot be filtered',
};

/** A host that applies everything, or refuses everything, and records it. */
const hostThat = (answer: readonly SourceRefusal[] = []) => ({
  setPredicate: vi.fn<(predicate: Predicate) => readonly SourceRefusal[]>(
    () => answer,
  ),
  removePredicate: vi.fn<
    (field: string, operator: PredicateOperator) => readonly SourceRefusal[]
  >(() => answer),
});

const cpuAtLeast = (host = hostThat()) => ({
  host,
  input: createFilterInput({
    schema: machines.schema,
    field: "cpu",
    operator: "gte",
    host,
  }),
});

describe("createFilterInput", () => {
  it("refuses a field the schema does not define", () => {
    expect(() =>
      createFilterInput({
        schema: machines.schema,
        field: "memory",
        operator: "gte",
        host: hostThat(),
      }),
    ).toThrow('the schema has no field "memory" to filter');
  });

  it("applies a valid edit through the host and publishes it", () => {
    const { host, input } = cpuAtLeast();
    input.edit("4");
    expect(host.setPredicate).toHaveBeenCalledWith({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
    expect(input.state.get()).toEqual({
      input: "4",
      feedback: { status: "applied" },
    });
    expect(input.predicate).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
    expect(input.applied.get()).toEqual({ kind: "value", value: 4 });
  });

  it("retains the applied predicate on an invalid edit and explains it", () => {
    const { host, input } = cpuAtLeast();
    input.edit("4");
    input.edit("four");
    expect(host.setPredicate).toHaveBeenCalledTimes(1);
    expect(input.predicate).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
    expect(input.state.get().feedback).toMatchObject({
      status: "invalid",
      retainsPredicate: true,
    });
    expect(input.state.get().input).toBe("four");
  });

  it("flags an invalid edit without a prior predicate as not retaining", () => {
    const { input } = cpuAtLeast();
    input.edit("nope");
    expect(input.state.get().feedback).toMatchObject({
      status: "invalid",
      retainsPredicate: false,
    });
    expect(input.applied.get()).toEqual({ kind: "empty" });
  });

  it("keeps an incomplete edit out of the query", () => {
    const { host, input } = cpuAtLeast();
    input.edit("");
    expect(host.setPredicate).not.toHaveBeenCalled();
    expect(input.state.get().feedback).toEqual({ status: "incomplete" });
  });

  it("keeps the predicate in force when the source refuses the edit", () => {
    const { host, input } = cpuAtLeast(hostThat([refusal]));
    input.edit("4");
    // Nothing applied: the host answered with what it refuses.
    expect(input.state.get()).toEqual({
      input: "4",
      feedback: {
        status: "refused",
        refusals: [refusal],
        retainsPredicate: false,
      },
    });
    expect(input.predicate).toBeNull();
    expect(input.applied.get()).toEqual({ kind: "empty" });
    // A refusal after a predicate stood says the predicate still does.
    host.setPredicate.mockReturnValueOnce([]);
    input.edit("8");
    input.edit("16");
    expect(input.state.get().feedback).toMatchObject({
      status: "refused",
      retainsPredicate: true,
    });
    expect(input.predicate?.operands).toEqual([8]);
  });

  it("sets operands directly and answers with the host's refusals", () => {
    const { host, input } = cpuAtLeast(hostThat([refusal]));
    expect(input.set([32])).toEqual([refusal]);
    host.setPredicate.mockReturnValueOnce([]);
    expect(input.set([32])).toEqual([]);
    expect(input.applied.get()).toEqual({ kind: "value", value: 32 });
    expect(input.state.get().feedback).toEqual({ status: "applied" });
  });

  it("reports operands the kind rejects in the feedback and applies nothing", () => {
    const { host, input } = cpuAtLeast();
    expect(input.set([128])).toEqual([]);
    expect(host.setPredicate).not.toHaveBeenCalled();
    expect(input.state.get().feedback).toMatchObject({
      status: "invalid",
      retainsPredicate: false,
    });
  });

  it("clears explicitly, distinct from invalid input", () => {
    const { host, input } = cpuAtLeast();
    input.edit("4");
    expect(input.clear()).toEqual([]);
    expect(host.removePredicate).toHaveBeenCalledWith("cpu", "gte");
    expect(input.state.get()).toEqual({
      input: "",
      feedback: { status: "none" },
    });
    expect(input.predicate).toBeNull();
    expect(input.applied.get()).toEqual({ kind: "empty" });
  });

  it("adopts an external predicate and discards the stale input", () => {
    const { input } = cpuAtLeast();
    input.edit("four");
    input.setApplied({ field: "cpu", operator: "gte", operands: [8] });
    expect(input.state.get()).toEqual({
      input: "8",
      feedback: { status: "none" },
    });
    expect(input.predicate).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [8],
    });
    input.setApplied(null);
    expect(input.state.get().input).toBe("");
    expect(input.applied.get()).toEqual({ kind: "empty" });
  });

  it("shows no input for an adopted predicate that carries no operand", () => {
    const host = hostThat();
    const owner = createFilterInput({
      schema: machines.schema,
      field: "owner",
      operator: "isSet",
      host,
    });
    owner.setApplied({ field: "owner", operator: "isSet", operands: [] });
    expect(owner.state.get().input).toBe("");
    expect(owner.applied.get()).toEqual({ kind: "value", value: true });
  });

  it("rejects a misrouted external predicate without side effects", () => {
    const { input } = cpuAtLeast();
    input.edit("4");
    const before = input.state.get();
    expect(() =>
      input.setApplied({ field: "cpu", operator: "lte", operands: [8] }),
    ).toThrow(
      "setApplied received a predicate for cpu/lte on a cpu/gte record",
    );
    expect(input.state.get()).toBe(before);
  });

  it("publishes the applied value only when it moves", () => {
    const { input } = cpuAtLeast();
    const seen = vi.fn();
    input.applied.subscribe(seen);
    input.edit("4");
    input.edit("4");
    expect(seen).toHaveBeenCalledTimes(1);
    input.edit("8");
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("compares applied sets by membership, not reference", () => {
    const host = hostThat();
    const status = createFilterInput({
      schema: machines.schema,
      field: "status",
      operator: "eq",
      host,
    });
    const seen = vi.fn();
    status.applied.subscribe(seen);
    status.set(["failed", "ready"]);
    status.set(["ready", "failed"]);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(status.applied.get()).toEqual({
      kind: "value",
      value: new Set(["failed", "ready"]),
    });
  });

  it("hands its channels out read-only at runtime", () => {
    const { input } = cpuAtLeast();
    for (const channel of [input.state, input.applied]) {
      expect(Object.isFrozen(channel)).toBe(true);
      expect(channel).not.toHaveProperty("set");
    }
  });
});
