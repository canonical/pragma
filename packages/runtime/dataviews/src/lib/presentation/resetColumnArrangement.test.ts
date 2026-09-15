import { describe, expect, it } from "vitest";
import createPresentation from "./createPresentation.js";
import resetColumnArrangement from "./resetColumnArrangement.js";

describe("resetColumnArrangement", () => {
  it("removes the order, the hidden columns and every width, and nothing else", () => {
    expect(
      resetColumnArrangement({
        presentation: {
          "table.order": ["cores"],
          "table.hidden": ["status"],
          "table.width.name": 200,
          "cards.size": "large",
        },
      }),
    ).toEqual({
      "table.order": undefined,
      "table.hidden": undefined,
      "table.width.name": undefined,
    });
    expect(
      resetColumnArrangement({ presentation: { "cards.size": "large" } }),
    ).toEqual({});
  });

  it("clears the columns a followed link chose once adopted, with a view named or none", () => {
    const hidden = { "table.hidden": ["status"] };
    const underDefault = createPresentation({
      linked: { view: null, presentation: hidden },
    });
    const releaseDefault = underDefault.observe();
    underDefault.arrange(
      resetColumnArrangement({ presentation: underDefault.state.get().own }),
    );
    expect(underDefault.state.get().presentation).toEqual({});
    releaseDefault();
    const underView = createPresentation({
      linked: { view: "v1", presentation: hidden },
    });
    underView.show({ id: "v1", presentation: {} });
    const releaseView = underView.observe();
    underView.arrange(
      resetColumnArrangement({ presentation: underView.state.get().own }),
    );
    expect(underView.state.get().presentation).toEqual({});
    releaseView();
  });

  it("clears the viewer's own layer, so an open view's saved arrangement shows through", () => {
    const presentation = createPresentation();
    presentation.show({
      id: "v1",
      presentation: { "table.hidden": ["status"] },
    });
    presentation.arrange({
      "table.hidden": ["cores"],
      "table.width.name": 200,
    });
    presentation.arrange(
      resetColumnArrangement({
        presentation: presentation.state.get().presentation,
      }),
    );
    expect(presentation.state.get().presentation).toEqual({
      "table.hidden": ["status"],
    });
  });
});
