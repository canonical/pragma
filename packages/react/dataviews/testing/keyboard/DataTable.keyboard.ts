/**
 * The keyboard-only pass over the DataTable's stories and its sort panel's,
 * in the built Storybook: Tab, Shift+Tab, Enter and Space, and no other key.
 *
 * Every story is walked both ways, asserting that each interactive control
 * is reached and that focus is visible on it when it is. Then the controls
 * a key operates are operated: a sort heading cycles and keeps focus, a row
 * checkbox checks. Arrow keys belong to no journey here: the table offers
 * no arrow navigation, and a resize handle's arrow keys are its own
 * enhancement, so the handle is only reached.
 *
 * Necessary evidence, not a conformance claim: it proves what a keyboard
 * reaches, not what a screen reader announces.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

type IndexedStory = {
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly type: string;
};

/** The table's stories. */
const TABLE = "_work_in_progress/DataTable";

/** The stories this pass walks: the table's own. */
const TITLES: readonly string[] = [TABLE];

/**
 * The built Storybook's index, trusted as the build writes it: only its
 * presence is checked, since it is a file another command writes.
 */
const index = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../storybook-static/index.json"),
    "utf8",
  ),
) as { readonly entries?: Readonly<Record<string, IndexedStory>> };
if (index.entries === undefined) {
  throw new Error(
    "storybook-static/index.json lists no entries: run `bun run build:storybook`",
  );
}

const stories = Object.values(index.entries).filter(
  (entry) => entry.type === "story" && TITLES.includes(entry.title),
);

/** The render phases after which a story is drawn and its play function done. */
const SETTLED_PHASES: readonly string[] = ["completed", "finished"];

/** The render phases a story stops in without rendering. */
const FAILED_PHASES: readonly string[] = ["errored", "aborted"];

/**
 * Open one story alone, and wait until Storybook reports it rendered and its
 * play function finished: a walk that began while a play function was still
 * moving focus would count the wrong controls.
 *
 * @note Impure: navigates the page.
 */
const openStory = async (page: Page, id: string): Promise<void> => {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
  const stopped = await page.waitForFunction(
    (phases) => {
      const preview = (
        window as {
          readonly __STORYBOOK_PREVIEW__?: {
            readonly currentRender?: { readonly phase?: string };
          };
        }
      ).__STORYBOOK_PREVIEW__;
      const phase = preview?.currentRender?.phase;
      return phase !== undefined && phases.includes(phase) ? phase : null;
    },
    [...SETTLED_PHASES, ...FAILED_PHASES],
  );
  const phase = await stopped.jsonValue();
  await stopped.dispose();
  if (phase === null || FAILED_PHASES.includes(phase)) {
    throw new Error(`story ${id} stopped without rendering: ${phase}`);
  }
  await expect(page.locator("#storybook-root > *").first()).toBeAttached();
};

/** The story with this title and name. */
const findStory = (title: string, name: string): IndexedStory => {
  const story = stories.find(
    (entry) => entry.title === title && entry.name === name,
  );
  if (story === undefined) {
    throw new Error(`no story "${name}" under "${title}"`);
  }
  return story;
};

/** The controls a story offers, as numbered for a walk. */
type Controls = {
  readonly count: number;
  /**
   * The numbers of controls inside a virtualized table's rows: such a row
   * is unmounted once it scrolls out of the viewport, focus included.
   */
  readonly virtualized: readonly number[];
  /** Each virtualized control's logical row, as `aria-rowindex` spells it. */
  readonly rows: Readonly<Record<number, string>>;
};

/**
 * Number every control a keyboard should reach inside the story: in the tab
 * order, enabled, rendered, and not hidden from assistive technology.
 *
 * @note Impure: marks each control in the page with its number.
 */
const markControls = (page: Page): Promise<Controls> =>
  page.evaluate(() => {
    const root = document.querySelector("#storybook-root");
    const candidates = root?.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, [tabindex]",
    );
    const controls = [...(candidates ?? [])].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        !(element instanceof HTMLInputElement && element.type === "hidden") &&
        element.checkVisibility({ visibilityProperty: true }) &&
        element.closest("[inert], [aria-hidden='true']") === null,
    );
    const virtualized: number[] = [];
    const rows: Record<number, string> = {};
    for (const [position, control] of controls.entries()) {
      control.dataset["keyboardControl"] = String(position);
      // A virtualized table reports every logical row, and its body rows
      // mount and unmount as it scrolls; its header row group never does.
      const inVirtualizedTable =
        control.closest("[role='table'][aria-rowcount]") !== null;
      const inHeader = control.closest("[role='rowgroup'].header") !== null;
      if (inVirtualizedTable && !inHeader) {
        virtualized.push(position);
        rows[position] =
          control.closest("[aria-rowindex]")?.getAttribute("aria-rowindex") ??
          "";
      }
    }
    return { count: controls.length, virtualized, rows };
  });

type Walk = {
  /** The numbered controls focus landed on. */
  readonly reached: ReadonlySet<number>;
  /**
   * Controls focus landed on a second time in one direction, before it came
   * round to the first control the walk reached: a browser with nowhere else
   * to send focus wraps back to the document's start, which ends the walk,
   * so a return to any other control is a trap.
   */
  readonly revisited: readonly number[];
  /**
   * The control focus was on when it fell to the document because that
   * control left the page: lost focus, not the end of the walk.
   */
  readonly lost: readonly number[];
  /**
   * The logical rows of a virtualized table's body focus landed on, as
   * `aria-rowindex` spells them, marked or not: a row scrolled away and back
   * is a new element carrying no mark, and landing there reaches it.
   */
  readonly reachedRows: ReadonlySet<string>;
  /** Controls focus landed on without a visible indicator, by their markup. */
  readonly invisible: readonly string[];
  /**
   * Whether the walk ran out of presses with focus still in a virtualized
   * table's body: each step there mounts another row, so a table of
   * thousands has more rows than any walk traverses, and the controls past
   * it were never in reach of this walk.
   */
  readonly truncatedInVirtualizedBody: boolean;
};

/**
 * Start a walk from one end of the document: focus a probe outside the tab
 * order placed there. Setting up where the walk starts, not a key press.
 *
 * Not `blur()`: a browser keeps the point sequential navigation starts from
 * where focus last was, so a story whose play function left focus on a
 * control would have its first Tab skip past that control.
 *
 * @note Impure: inserts a focus probe into the page and moves focus to it.
 */
const startAt = (page: Page, end: "start" | "end"): Promise<void> =>
  page.evaluate((where) => {
    for (const stale of document.querySelectorAll("[data-keyboard-probe]")) {
      stale.remove();
    }
    const probe = document.createElement("span");
    probe.tabIndex = -1;
    probe.dataset["keyboardProbe"] = "";
    if (where === "start") {
      document.body.prepend(probe);
    } else {
      document.body.append(probe);
    }
    probe.focus();
  }, end);

/**
 * Press one key from the top (or the bottom, for Shift+Tab) of the document
 * until focus leaves the page, recording every numbered control it lands on
 * and whether focus was visible there.
 *
 * @note Impure: inserts a probe, moves focus and presses keys in the page.
 */
const walk = async (
  page: Page,
  key: "Tab" | "Shift+Tab",
  count: number,
): Promise<Walk> => {
  const reached = new Set<number>();
  const revisited: number[] = [];
  const lost: number[] = [];
  let firstMark: number | null = null;
  let lastMark: number | null = null;
  const reachedRows = new Set<string>();
  const invisible: string[] = [];
  await startAt(page, key === "Tab" ? "start" : "end");
  let leftTheDocument = false;
  for (let press = 0; press < count * 3 + 5; press += 1) {
    // Focus lost since the last press: on the document, from a control that
    // left the page after the walk had already checked it.
    if (
      lastMark !== null &&
      (await page.evaluate(
        (mark) =>
          document.activeElement === document.body &&
          document.querySelector(`[data-keyboard-control="${mark}"]`) === null,
        lastMark,
      ))
    ) {
      lost.push(lastMark);
      break;
    }
    await page.keyboard.press(key);
    const landed = await page.evaluate(() => {
      const active = document.activeElement;
      if (
        !(active instanceof HTMLElement) ||
        active === document.body ||
        active.dataset["keyboardProbe"] !== undefined
      ) {
        return null;
      }
      const style = getComputedStyle(active);
      const outlined =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0;
      return {
        mark: active.dataset["keyboardControl"] ?? null,
        visible:
          active.matches(":focus-visible") &&
          (outlined || style.boxShadow !== "none"),
        markup: active.outerHTML.slice(0, 120),
        row:
          active.closest("[role='table'][aria-rowcount]") === null
            ? null
            : (active
                .closest("[aria-rowindex]")
                ?.getAttribute("aria-rowindex") ?? null),
      };
    });
    if (landed === null) {
      // Focus left the document after reaching something: the walk is done,
      // unless the control it left is gone, which lost the reader's place.
      if (reached.size > 0) {
        if (
          lastMark !== null &&
          (await page.evaluate(
            (mark) =>
              document.querySelector(`[data-keyboard-control="${mark}"]`) ===
              null,
            lastMark,
          ))
        ) {
          lost.push(lastMark);
        }
        leftTheDocument = true;
        break;
      }
      continue;
    }
    if (landed.row !== null) {
      reachedRows.add(landed.row);
    }
    if (landed.mark !== null) {
      const mark = Number(landed.mark);
      if (mark === firstMark) {
        // Focus wrapped round to where the walk began: every control on the
        // way has been passed, as if focus had left the page.
        leftTheDocument = true;
        break;
      }
      firstMark ??= mark;
      if (reached.has(mark)) {
        revisited.push(mark);
      }
      reached.add(mark);
      lastMark = mark;
    }
    if (!landed.visible) {
      invisible.push(landed.markup);
    }
  }
  const endedInVirtualizedBody = await page.evaluate(() => {
    const active = document.activeElement;
    return (
      active !== null &&
      active.closest("[role='table'][aria-rowcount]") !== null &&
      active.closest("[role='rowgroup'].header") === null
    );
  });
  return {
    reached,
    revisited,
    lost,
    reachedRows,
    invisible,
    truncatedInVirtualizedBody: !leftTheDocument && endedInVirtualizedBody,
  };
};

/**
 * The numbered controls a walk never reached, each with its markup, so a
 * failure says which control it was.
 *
 * A control in a virtualized table's body that has left the document is
 * not a miss when its row is not mounted — the table unmounted that row as
 * focus scrolled the viewport away, and no keyboard can reach a row that is
 * not mounted — or when focus landed on that row after it was mounted
 * again, a new element the walk reached. One whose row is mounted and was
 * never reached is reported, as is any other control that disappears.
 */
const listMissed = (
  page: Page,
  walked: Walk,
  controls: Controls,
): Promise<readonly { mark: number; connected: boolean; markup: string }[]> =>
  page.evaluate(
    ({ reached, total, virtualized, rows, reachedRows }) =>
      Array.from({ length: total }, (_unused, at) => at)
        .filter((at) => !reached.includes(at))
        .map((at) => {
          const element = document.querySelector(
            `[data-keyboard-control="${at}"]`,
          );
          return {
            mark: at,
            connected: element !== null,
            markup: element?.outerHTML.slice(0, 160) ?? "",
          };
        })
        .filter(
          (miss) =>
            miss.connected ||
            !virtualized.includes(miss.mark) ||
            (document.querySelector(
              `[role='table'][aria-rowcount] [aria-rowindex="${rows[miss.mark]}"]`,
            ) !== null &&
              !reachedRows.includes(rows[miss.mark] ?? "")),
        ),
    {
      reached: [...walked.reached],
      total: controls.count,
      virtualized: [...controls.virtualized],
      rows: controls.rows,
      reachedRows: [...walked.reachedRows],
    },
  );

/**
 * Tab from the top of the document until this control has focus.
 *
 * @note Impure: marks the control for the length of the walk. Marked once,
 * because a role query resolved again on every press recomputes every
 * accessible name on the page each time.
 */
const tabTo = async (page: Page, control: Locator): Promise<void> => {
  await control.evaluate((element) => {
    element.setAttribute("data-tab-target", "");
  });
  try {
    await startAt(page, "start");
    for (let press = 0; press < 200; press += 1) {
      await page.keyboard.press("Tab");
      if (
        await page.evaluate(
          () => document.activeElement?.matches("[data-tab-target]") === true,
        )
      ) {
        return;
      }
    }
    throw new Error("Tab never reached the control");
  } finally {
    await page.evaluate(() => {
      for (const marked of document.querySelectorAll("[data-tab-target]")) {
        marked.removeAttribute("data-tab-target");
      }
    });
  }
};

test.describe("DataTable stories, keyboard only", () => {
  for (const story of stories) {
    test(`${story.title} ${story.name}: every control is reached both ways, focus visible`, async ({
      page,
    }) => {
      await openStory(page, story.id);
      const controls = await markControls(page);
      for (const key of ["Tab", "Shift+Tab"] as const) {
        const walked = await walk(page, key, controls.count);
        // Every control it reached shows where focus is, however it ended.
        expect(walked.invisible).toEqual([]);
        // Focus never returns to a control within one walk: that is a trap.
        expect(walked.revisited).toEqual([]);
        // Nor falls to the document from a control that left the page.
        expect(walked.lost).toEqual([]);
        // A walk still inside a virtualized table of thousands of rows when
        // its presses run out never had the far side in reach: tabbing past
        // such a table is the keyboard delegate's problem, not this pass's.
        // What it passed on the way in is still required.
        const missed = await listMissed(page, walked, controls);
        const first = Math.min(...controls.virtualized);
        const last = Math.max(...controls.virtualized);
        const rowsReached = [...walked.reachedRows].map(Number);
        // How far into the body the walk got, in its own direction.
        // With no row reached, no row of the body is beyond the walk.
        const furthest =
          rowsReached.length === 0
            ? null
            : key === "Tab"
              ? Math.max(...rowsReached)
              : Math.min(...rowsReached);
        const isBeyondTheBody = (mark: number): boolean => {
          if (controls.virtualized.includes(mark)) {
            const row = Number(controls.rows[mark]);
            if (furthest === null) {
              return false;
            }
            return key === "Tab" ? row > furthest : row < furthest;
          }
          return key === "Tab" ? mark > last : mark < first;
        };
        expect(
          walked.truncatedInVirtualizedBody
            ? missed.filter((miss) => !isBeyondTheBody(miss.mark))
            : missed,
        ).toEqual([]);
      }
    });
  }

  test("Sortable: Enter and Space cycle a header's sort, Shift adds a term, focus stays", async ({
    page,
  }) => {
    await openStory(page, findStory(TABLE, "Sortable").id);
    const host = page.getByRole("columnheader", { name: "Host", exact: true });
    const status = page.getByRole("columnheader", {
      name: "Status",
      exact: true,
    });
    const hostSort = host.getByRole("button", { name: "Host", exact: true });
    const statusSort = status.getByRole("button", {
      name: "Status",
      exact: true,
    });
    // At rest nothing is sorted, and no header claims it is.
    await expect(host).not.toHaveAttribute("aria-sort");

    await tabTo(page, hostSort);
    await page.keyboard.press("Enter");
    await expect(host).toHaveAttribute("aria-sort", "ascending");
    await expect(hostSort).toBeFocused();
    await page.keyboard.press("Space");
    await expect(host).toHaveAttribute("aria-sort", "descending");
    await expect(hostSort).toBeFocused();

    // Shift adds Status as the second term; Host keeps the sort's claim.
    await tabTo(page, statusSort);
    await page.keyboard.press("Shift+Enter");
    await expect(statusSort).toHaveAccessibleDescription("ascending, 2nd of 2");
    await expect(status.locator(".precedence")).toHaveText("2");
    await expect(host).toHaveAttribute("aria-sort", "descending");
    await expect(status).not.toHaveAttribute("aria-sort");
    await expect(statusSort).toBeFocused();
    await page.keyboard.press("Shift+Space");
    await expect(statusSort).toHaveAccessibleDescription(
      "descending, 2nd of 2",
    );
    await expect(statusSort).toBeFocused();

    // Enter alone on a descending Status completes its cycle: back to the
    // source's own order, which here orders by nothing.
    await page.keyboard.press("Enter");
    await expect(status).not.toHaveAttribute("aria-sort");
    await expect(host).not.toHaveAttribute("aria-sort");
    await expect(statusSort).toBeFocused();
    // Enter again starts it over, by Status alone.
    await page.keyboard.press("Enter");
    await expect(status).toHaveAttribute("aria-sort", "ascending");
    await expect(status.locator(".precedence")).toHaveCount(0);
  });

  test("Selectable: Space checks a row's checkbox", async ({ page }) => {
    await openStory(page, findStory(TABLE, "Selectable").id);
    const checkbox = page.getByRole("checkbox", {
      name: "Select alder.example.com",
    });
    await tabTo(page, checkbox);
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeFocused();
  });
});
