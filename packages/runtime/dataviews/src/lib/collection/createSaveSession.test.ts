import { describe, expect, it } from "vitest";
import createSaveSession from "./createSaveSession.js";

interface Preferences {
  readonly density: "comfortable" | "compact";
}

const equals = (a: Preferences, b: Preferences): boolean =>
  a.density === b.density;

const session = (initial: Preferences = { density: "comfortable" }) =>
  createSaveSession<Preferences>({ initial, equals });

const beginSave = (save: ReturnType<typeof session>): string => {
  const attempt = save.beginSave();
  if (attempt === null) {
    throw new Error("expected a save attempt");
  }
  return attempt;
};

describe("createSaveSession", () => {
  it("starts clean at the initial baseline", () => {
    expect(session().state).toMatchObject({
      status: "idle",
      dirty: false,
      revision: 0,
      failureReason: null,
      submitted: null,
    });
  });

  it("marks edits dirty and bumps the revision", () => {
    const save = session();
    save.edit({ density: "compact" });
    expect(save.state.dirty).toBe(true);
    expect(save.state.revision).toBe(1);
  });

  it("updates only the submitted baseline on completion", () => {
    const save = session();
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    // The user keeps editing while the save is in flight.
    save.edit({ density: "comfortable" });
    save.saveCompleted(attempt);
    const state = save.state;
    expect(state.baseline).toEqual({ density: "compact" });
    expect(state.current).toEqual({ density: "comfortable" });
    // Edits made while saving remain dirty.
    expect(state.dirty).toBe(true);
    expect(state.status).toBe("idle");
  });

  it("reports clean when the saved snapshot is still current", () => {
    const save = session();
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    save.saveCompleted(attempt);
    expect(save.state.dirty).toBe(false);
    expect(save.state.baseline).toEqual({ density: "compact" });
  });

  it("retains the baseline and records the reason on failure", () => {
    const save = session();
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    save.saveFailed(attempt, "quota exceeded");
    const state = save.state;
    expect(state.baseline).toEqual({ density: "comfortable" });
    expect(state.current).toEqual({ density: "compact" });
    expect(state.dirty).toBe(true);
    expect(state.status).toBe("failed");
    expect(state.failureReason).toBe("quota exceeded");
  });

  it("allows a retry after failure", () => {
    const save = session();
    save.edit({ density: "compact" });
    const first = beginSave(save);
    save.saveFailed(first, "offline");
    const second = beginSave(save);
    save.saveCompleted(second);
    expect(save.state.status).toBe("idle");
    expect(save.state.dirty).toBe(false);
  });

  it("ignores a late completion of a superseded attempt", () => {
    const save = session();
    save.edit({ density: "compact" });
    const first = beginSave(save);
    save.saveFailed(first, "offline");
    save.edit({ density: "compact" });
    const second = beginSave(save);
    // The first attempt's durable success resolves after the retry started.
    save.saveCompleted(first);
    const state = save.state;
    expect(state.status).toBe("saving");
    expect(state.submitted).toEqual({ density: "compact" });
    save.saveCompleted(second);
    expect(save.state.status).toBe("idle");
    expect(save.state.dirty).toBe(false);
  });

  it("ignores a late failure of a superseded attempt", () => {
    const save = session();
    save.edit({ density: "compact" });
    const first = beginSave(save);
    save.saveFailed(first, "offline");
    save.edit({ density: "compact" });
    const second = beginSave(save);
    // The first attempt's failure resolves after the retry started.
    save.saveFailed(first, "stale failure");
    const state = save.state;
    expect(state.status).toBe("saving");
    expect(state.submitted).toEqual({ density: "compact" });
    expect(state.failureReason).toBeNull();
    save.saveCompleted(second);
    expect(save.state.status).toBe("idle");
  });

  it("refuses a second save while one is in flight", () => {
    const save = session();
    save.edit({ density: "compact" });
    expect(save.beginSave()).not.toBeNull();
    expect(save.beginSave()).toBeNull();
    expect(save.state.submitted).toEqual({ density: "compact" });
  });

  it("ignores completions and failures without a current attempt", () => {
    const save = session();
    save.saveCompleted("s9");
    save.saveFailed("s9", "unexpected");
    expect(save.state.status).toBe("idle");
    expect(save.state.failureReason).toBeNull();
  });

  it("applies a delayed external read to the still-current target", () => {
    const save = session();
    const seenRevision = save.state.revision;
    save.edit({ density: "compact" });
    // The read resolves after it was issued but the value moved on.
    expect(save.applyExternalRead({ density: "compact" }, seenRevision)).toBe(
      false,
    );
    expect(save.state.current).toEqual({ density: "compact" });
    expect(save.state.baseline).toEqual({ density: "comfortable" });
  });

  it("adopts an external read that is still current", () => {
    const save = session();
    const seenRevision = save.state.revision;
    expect(save.applyExternalRead({ density: "compact" }, seenRevision)).toBe(
      true,
    );
    expect(save.state.baseline).toEqual({ density: "compact" });
    expect(save.state.current).toEqual({ density: "compact" });
    expect(save.state.dirty).toBe(false);
  });

  it("clears the failed status when an external read applies", () => {
    const save = session();
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    save.saveFailed(attempt, "offline");
    expect(save.state.status).toBe("failed");
    const seenRevision = save.state.revision;
    expect(save.applyExternalRead({ density: "compact" }, seenRevision)).toBe(
      true,
    );
    const state = save.state;
    expect(state.status).toBe("idle");
    expect(state.failureReason).toBeNull();
    expect(state.dirty).toBe(false);
  });

  it("discards an external read while a save is in flight", () => {
    const save = session();
    save.edit({ density: "compact" });
    const seenRevision = save.state.revision;
    beginSave(save);
    expect(
      save.applyExternalRead({ density: "comfortable" }, seenRevision),
    ).toBe(false);
    expect(save.state.current).toEqual({ density: "compact" });
  });

  it("discards a read that raced a save submission", () => {
    const save = session();
    const seenRevision = save.state.revision;
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    save.saveCompleted(attempt);
    // The read was issued against the pre-save store value; the submission
    // moved the revision, so it must not revert the saved value locally.
    expect(
      save.applyExternalRead({ density: "comfortable" }, seenRevision),
    ).toBe(false);
    expect(save.state.current).toEqual({ density: "compact" });
    expect(save.state.dirty).toBe(false);
  });

  it("resets the failed status on the next edit", () => {
    const save = session();
    save.edit({ density: "compact" });
    const attempt = beginSave(save);
    save.saveFailed(attempt, "offline");
    expect(save.state.status).toBe("failed");
    save.edit({ density: "compact" });
    expect(save.state.status).toBe("idle");
    expect(save.state.failureReason).toBeNull();
    expect(save.state.dirty).toBe(true);
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const save = session();
    const first = save.state;
    expect(save.state).toBe(first);
    save.edit({ density: "compact" });
    expect(save.state).not.toBe(first);
  });
});
