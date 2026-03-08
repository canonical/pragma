import { contentPresets } from "./content.js";
import { fonts } from "./fonts.js";

/**
 * Engine IDs matching the <link> elements in index.html.
 * Only one is enabled at a time; the rest have `disabled`.
 */
const ENGINES = [
  { id: "engine-classic", label: "Classic (extracted metrics)" },
  { id: "engine-text-trim", label: "Text-trim (cap unit + text-box)" },
  { id: "engine-cap", label: "Cap-unit nudge (cap unit only)" },
];

/**
 * <settings-sidebar>
 *
 * Full-height left sidebar containing:
 *   - Engine picker (switches the active baseline CSS)
 *   - Font picker (<select> populated from fonts.js)
 *   - Per-tag size & line-height-multiplier sliders (h1-h6, p)
 *   - Baseline height slider
 *
 * Font switching updates:
 *   1. The active @font-face / Google Fonts <link>
 *   2. :root CSS variables (--ascender, --descender, --units-per-em)
 *   3. html font-family + font-weight + font-style
 */
class SettingsSidebar extends HTMLElement {
  /** @type {HTMLStyleElement | HTMLLinkElement | null} */
  #fontElement = null;

  connectedCallback() {
    this.innerHTML = this.#template();
    this.querySelector("#engine-select").addEventListener("change", (e) => {
      this.#switchEngine(e.target.value);
    });
    this.querySelector("#font-select").addEventListener("change", (e) => {
      this.#applyFont(e.target.value);
    });
    this.querySelector("#content-select").addEventListener("change", (e) => {
      this.#applyContent(e.target.value);
    });

    // Apply defaults on load
    this.#applyFont(fonts[0].name);
    this.#applyContent(contentPresets[0].name);
  }

  /* ------------------------------------------------------------------ */
  /*  Engine switching                                                   */
  /* ------------------------------------------------------------------ */

  #switchEngine(engineId) {
    for (const engine of ENGINES) {
      const link = document.getElementById(engine.id);
      if (!link) continue;
      link.disabled = engine.id !== engineId;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Font switching                                                     */
  /* ------------------------------------------------------------------ */

  #applyFont(name) {
    const font = fonts.find((f) => f.name === name);
    if (!font) return;

    // Remove previous font-loading element
    if (this.#fontElement) {
      this.#fontElement.remove();
      this.#fontElement = null;
    }

    // Load the font
    if (font.source === "local") {
      const style = document.createElement("style");
      style.setAttribute("data-font-loader", "");
      style.textContent = `
        @font-face {
          font-family: "${font.family}";
          src: url("${font.file}") format("woff2");
          font-weight: ${font.weight};
          font-style: ${font.style};
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
      this.#fontElement = style;
    } else if (font.source === "google") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.url;
      link.setAttribute("data-font-loader", "");
      document.head.appendChild(link);
      this.#fontElement = link;
    }

    // Update font properties on html
    const html = document.documentElement;
    html.style.fontFamily = `"${font.family}", sans-serif`;
    html.style.fontWeight = font.weight;
    html.style.fontStyle = font.style;

    // Update :root metric variables
    html.style.setProperty("--ascender", font.metrics.ascender);
    html.style.setProperty("--descender", font.metrics.descender);
    html.style.setProperty("--units-per-em", font.metrics.unitsPerEm);

    // Update metrics display
    const display = this.querySelector("#font-metrics");
    if (display) {
      display.innerHTML = `
        <span>ascender: <strong>${font.metrics.ascender}</strong></span>
        <span>descender: <strong>${font.metrics.descender}</strong></span>
        <span>unitsPerEm: <strong>${font.metrics.unitsPerEm}</strong></span>
      `;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Content switching                                                  */
  /* ------------------------------------------------------------------ */

  #applyContent(name) {
    const preset = contentPresets.find((c) => c.name === name);
    if (!preset) return;
    const main = document.querySelector("main");
    if (main) main.innerHTML = preset.html;
  }

  /* ------------------------------------------------------------------ */
  /*  Template                                                           */
  /* ------------------------------------------------------------------ */

  #template() {
    const engineOptions = ENGINES.map(
      (e) => `<option value="${e.id}">${e.label}</option>`,
    ).join("\n");

    const fontOptions = fonts
      .map((f) => `<option value="${f.name}">${f.name}</option>`)
      .join("\n");

    const contentOptions = contentPresets
      .map((c) => `<option value="${c.name}">${c.name}</option>`)
      .join("\n");

    return `
      <div class="sidebar-inner">
        <div class="sidebar-title">Settings</div>

        <!-- Engine picker -->
        <fieldset>
          <legend>Engine</legend>
          <select id="engine-select">${engineOptions}</select>
        </fieldset>

        <!-- Font picker -->
        <fieldset>
          <legend>Font</legend>
          <select id="font-select">${fontOptions}</select>
          <div id="font-metrics" class="metrics-display"></div>
        </fieldset>

        <!-- Content picker -->
        <fieldset>
          <legend>Content</legend>
          <select id="content-select">${contentOptions}</select>
        </fieldset>

        <!-- Baseline height -->
        <fieldset>
          <legend>Baseline grid</legend>
          <control-input
            label="Height"
            min="0.1"
            max="2"
            step="0.05"
            value="0.5"
            target-selector=":root"
            css-variable="--baseline-height"
            unit="rem"
          ></control-input>
        </fieldset>

        <!-- h1 -->
        <fieldset>
          <legend>h1</legend>
          <control-input
            label="Size"
            min="0.5"
            max="12"
            step="0.125"
            value="2.625"
            target-selector="h1"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="20"
            step="1"
            value="6"
            target-selector="h1"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h1"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- h2 -->
        <fieldset>
          <legend>h2</legend>
          <control-input
            label="Size"
            min="0.5"
            max="10"
            step="0.125"
            value="2.625"
            target-selector="h2"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="16"
            step="1"
            value="6"
            target-selector="h2"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h2"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- h3 -->
        <fieldset>
          <legend>h3</legend>
          <control-input
            label="Size"
            min="0.5"
            max="8"
            step="0.125"
            value="1.5"
            target-selector="h3"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="14"
            step="1"
            value="4"
            target-selector="h3"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h3"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- h4 -->
        <fieldset>
          <legend>h4</legend>
          <control-input
            label="Size"
            min="0.5"
            max="6"
            step="0.125"
            value="1.5"
            target-selector="h4"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="12"
            step="1"
            value="4"
            target-selector="h4"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h4"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- h5 -->
        <fieldset>
          <legend>h5</legend>
          <control-input
            label="Size"
            min="0.5"
            max="4"
            step="0.125"
            value="1"
            target-selector="h5"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="12"
            step="1"
            value="3"
            target-selector="h5"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h5"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- h6 -->
        <fieldset>
          <legend>h6</legend>
          <control-input
            label="Size"
            min="0.5"
            max="4"
            step="0.125"
            value="1"
            target-selector="h6"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="12"
            step="1"
            value="3"
            target-selector="h6"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="h6"
            css-variable="--space-after"
          ></control-input>
        </fieldset>

        <!-- p -->
        <fieldset>
          <legend>p</legend>
          <control-input
            label="Size"
            min="0.5"
            max="4"
            step="0.125"
            value="1"
            target-selector="p"
            css-variable="--font-size"
            unit="rem"
          ></control-input>
          <control-input
            label="LH mult"
            min="1"
            max="12"
            step="1"
            value="3"
            target-selector="p"
            css-variable="--line-height-multiplier"
          ></control-input>
          <control-input
            label="Space after"
            min="0"
            max="10"
            step="1"
            value="2"
            target-selector="p"
            css-variable="--space-after"
          ></control-input>
        </fieldset>
      </div>
    `;
  }
}

customElements.define("settings-sidebar", SettingsSidebar);
