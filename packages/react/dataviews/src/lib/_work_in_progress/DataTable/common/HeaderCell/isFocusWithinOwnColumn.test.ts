import { describe, expect, it, onTestFinished } from "vitest";
import isFocusWithinOwnColumn from "./isFocusWithinOwnColumn.js";

/** A header holding a control and a menu trigger, with that menu's surface portalled beside it. */
const buildColumn = (surfaceId: string) => {
  const header = document.createElement("div");
  const control = document.createElement("button");
  const trigger = document.createElement("button");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", surfaceId);
  header.append(control, trigger);
  const surface = document.createElement("div");
  surface.id = surfaceId;
  const item = document.createElement("button");
  surface.append(item);
  document.body.append(header, surface);
  onTestFinished(() => {
    header.remove();
    surface.remove();
  });
  return { header, control, item };
};

describe("isFocusWithinOwnColumn", () => {
  it("keeps focus that moves within the header", () => {
    const { header, control } = buildColumn("status-menu");
    expect(isFocusWithinOwnColumn(header, control)).toBe(true);
  });

  it("keeps focus that moves into the surface its own trigger controls", () => {
    const { header, item } = buildColumn("status-menu");
    expect(isFocusWithinOwnColumn(header, item)).toBe(true);
  });

  it("reads only the menu trigger's controls, not another control's", () => {
    const { header, item } = buildColumn("status-menu");
    const separator = document.createElement("div");
    separator.setAttribute("aria-controls", "a-column");
    header.prepend(separator);
    expect(isFocusWithinOwnColumn(header, item)).toBe(true);
  });

  it("looks the surface up in the header's own document", () => {
    const popout = document.implementation.createHTMLDocument("popout");
    const header = popout.createElement("div");
    const trigger = popout.createElement("button");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-controls", "popout-menu");
    header.append(trigger);
    const surface = popout.createElement("div");
    surface.id = "popout-menu";
    const item = popout.createElement("button");
    surface.append(item);
    popout.body.append(header, surface);
    expect(isFocusWithinOwnColumn(header, item)).toBe(true);
  });

  it("lets focus go to another column's control or menu", () => {
    const status = buildColumn("status-menu");
    const name = buildColumn("name-menu");
    expect(isFocusWithinOwnColumn(status.header, name.control)).toBe(false);
    expect(isFocusWithinOwnColumn(status.header, name.item)).toBe(false);
  });

  it("lets focus go from a header whose menu is closed or absent", () => {
    const header = document.createElement("div");
    const elsewhere = document.createElement("button");
    document.body.append(header, elsewhere);
    onTestFinished(() => {
      header.remove();
      elsewhere.remove();
    });
    expect(isFocusWithinOwnColumn(header, elsewhere)).toBe(false);
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-controls", "a-menu-not-mounted");
    header.append(trigger);
    expect(isFocusWithinOwnColumn(header, elsewhere)).toBe(false);
  });
});
