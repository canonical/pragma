import { resolveMessages } from "@canonical/dataviews-core/bindings";
import { describe, expect, it } from "vitest";
import describeStatus from "./describeStatus.js";

const english = resolveMessages();

describe("describeStatus", () => {
  it("gives each status its own words", () => {
    expect(describeStatus({ status: "pending" }, english)).toBe("Loading…");
    expect(describeStatus({ status: "regrouping" }, english)).toBe(
      "Regrouping…",
    );
    expect(
      describeStatus({ status: "failed", reason: "offline" }, english),
    ).toBe("These rows could not be loaded: offline");
    // A failed refresh keeps its rows, so the words say what could not be
    // done rather than what is missing.
    expect(
      describeStatus({ status: "refresh-failed", reason: "offline" }, english),
    ).toBe("These rows could not be refreshed: offline");
    expect(
      describeStatus({ status: "stale", reason: "offline" }, english),
    ).toBe("These rows do not match the current query: offline");
    expect(describeStatus({ status: "no-results" }, english)).toBe(
      "No rows match this query.",
    );
    expect(describeStatus({ status: "no-data" }, english)).toBe(
      "There is nothing here yet.",
    );
  });

  it("words each status in the messages it is given", () => {
    const messages = resolveMessages({
      statusPending: "Chargement…",
      statusFailed: (reason) => `Échec : ${reason}`,
    });
    expect(describeStatus({ status: "pending" }, messages)).toBe("Chargement…");
    expect(
      describeStatus({ status: "failed", reason: "hors ligne" }, messages),
    ).toBe("Échec : hors ligne");
  });
});
