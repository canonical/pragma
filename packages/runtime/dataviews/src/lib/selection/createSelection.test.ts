import { describe, expect, it } from "vitest";
import createSelection from "./createSelection.js";

describe("createSelection", () => {
  it("starts with the given identities, empty by default", () => {
    expect(createSelection().state.ids.size).toBe(0);
    expect(createSelection(["a", "b"]).state.ids).toEqual(new Set(["a", "b"]));
  });

  it("collapses duplicate identities in the initial set", () => {
    expect(createSelection(["a", "a", "b"]).state.ids).toEqual(
      new Set(["a", "b"]),
    );
  });

  it("treats the empty set as a valid, observable state", () => {
    const selection = createSelection();
    let notifications = 0;
    selection.subscribe(() => {
      notifications += 1;
    });
    selection.clear();
    expect(selection.state.ids.size).toBe(0);
    expect(notifications).toBe(0);
  });

  it("toggles identities in and out", () => {
    const selection = createSelection();
    selection.toggle("machine-1");
    expect(selection.state.ids).toEqual(new Set(["machine-1"]));
    selection.toggle("machine-1");
    expect(selection.state.ids.size).toBe(0);
  });

  it("replaces, adds and removes identities", () => {
    const selection = createSelection(["a"]);
    selection.set(["b", "c"]);
    expect(selection.state.ids).toEqual(new Set(["b", "c"]));
    selection.add(["a", "b"]);
    expect(selection.state.ids).toEqual(new Set(["a", "b", "c"]));
    selection.remove(["a", "c"]);
    expect(selection.state.ids).toEqual(new Set(["b"]));
  });

  it("notifies only when the identity set changes", () => {
    const selection = createSelection(["a"]);
    let notifications = 0;
    selection.subscribe(() => {
      notifications += 1;
    });
    selection.add(["a"]);
    expect(notifications).toBe(0);
    selection.add(["b"]);
    expect(notifications).toBe(1);
    selection.set(["a", "b"]);
    expect(notifications).toBe(1);
    selection.remove(["z"]);
    expect(notifications).toBe(1);
    selection.clear();
    expect(notifications).toBe(2);
  });

  it("notifies when a same-size replacement changes membership", () => {
    const selection = createSelection(["a", "b"]);
    let notifications = 0;
    selection.subscribe(() => {
      notifications += 1;
    });
    selection.set(["a", "c"]);
    expect(selection.state.ids).toEqual(new Set(["a", "c"]));
    expect(notifications).toBe(1);
  });

  it("serves immutable snapshots between changes", () => {
    const selection = createSelection(["a"]);
    const first = selection.state;
    expect(selection.state).toBe(first);
    selection.toggle("b");
    expect(selection.state).not.toBe(first);
    expect(first.ids).toEqual(new Set(["a"]));
  });

  it("freezes each published snapshot", () => {
    const selection = createSelection();
    selection.toggle("a");
    expect(Object.isFrozen(selection.state)).toBe(true);
  });

  it("bumps the revision only on accepted mutations", () => {
    const selection = createSelection(["a"]);
    expect(selection.state.revision).toBe(0);
    selection.add(["a"]); // no membership change
    expect(selection.state.revision).toBe(0);
    selection.add(["b"]);
    expect(selection.state.revision).toBe(1);
    selection.remove(["z"]); // absent identity: no change
    expect(selection.state.revision).toBe(1);
    selection.toggle("b"); // removal is a change
    expect(selection.state.revision).toBe(2);
  });

  it("supports unsubscribe", () => {
    const selection = createSelection();
    let notifications = 0;
    const unsubscribe = selection.subscribe(() => {
      notifications += 1;
    });
    selection.toggle("a");
    unsubscribe();
    selection.toggle("a");
    expect(notifications).toBe(1);
  });
});
