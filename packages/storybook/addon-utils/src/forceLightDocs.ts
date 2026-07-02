// Storybook renders autodocs into `#storybook-docs` (Storybook 10; `.sbdocs` is
// the content wrapper), in the SAME preview document as the canvas
// (`#storybook-root`). The design-system tokens use `color-scheme: light dark`
// + `light-dark()`, so with no explicit scheme they follow the OS. On docs
// pages the scheme toolbar is not available (it is registered for the `story`
// view mode only) and no `.light`/`.dark` class is applied to the document — so
// on a dark-mode OS the docs render dark inside Storybook's light docs chrome,
// a mismatch.
//
// Force `color-scheme: light` on the docs root so autodocs are always light,
// independent of the OS or the canvas theme toggle. Scoped to the docs root, so
// the canvas (`#storybook-root`) stays fully theme-toggleable.
//
// Injected once, at preview module load, so every consumer of this addon gets
// it without any per-project CSS.

const STYLE_ID = "ds-utils-force-light-docs";

if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = "#storybook-docs, .sbdocs { color-scheme: light; }";
  document.head.appendChild(style);
}
