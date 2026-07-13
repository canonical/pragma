/**
 * <control-input> – numeric input for CSS variable control.
 *
 * Attributes:
 *   label, min, max, step, value, target-selector, css-variable, unit
 *
 * The initial value is READ FROM THE CSS: the input seeds itself from the
 * computed value of `css-variable` on the first element matching
 * `target-selector`, so the stylesheet is the single source of truth and the
 * control stays in sync with it (two-way binding). The `value` attribute is only
 * a fallback used when the CSS does not define the variable.
 */
class ControlInput extends HTMLElement {
  /** Read the current value of `cssVariable` on `targetSelector` from the CSS,
   *  stripped of `unit`. Returns null if unset/unreadable. */
  readCssValue(targetSelector, cssVariable, unit) {
    const el = document.querySelector(targetSelector);
    if (!el) return null;
    const raw = getComputedStyle(el).getPropertyValue(cssVariable).trim();
    if (!raw) return null;
    // Drop the unit suffix (e.g. "0.25rem" -> "0.25") so it fits a number input.
    const stripped = unit && raw.endsWith(unit) ? raw.slice(0, -unit.length) : raw;
    const n = Number.parseFloat(stripped);
    return Number.isNaN(n) ? null : String(n);
  }

  connectedCallback() {
    const label = this.getAttribute("label");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const step = this.getAttribute("step");
    const targetSelector = this.getAttribute("target-selector");
    const cssVariable = this.getAttribute("css-variable");
    const unit = this.getAttribute("unit") || "";

    // Prefer the live CSS value; fall back to the `value` attribute.
    const value =
      this.readCssValue(targetSelector, cssVariable, unit) ??
      this.getAttribute("value");

    this.innerHTML = `
      <div class="control">
        <label>${label}</label>
        <input
          type="number"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
        />${unit ? `<span class="unit">${unit}</span>` : ""}
      </div>
    `;

    const input = this.querySelector("input");
    input.addEventListener("input", (event) => {
      // Search same-origin stylesheets in reverse (inline <style> is last)
      const sheets = [...document.styleSheets].reverse();
      for (const sheet of sheets) {
        try {
          if (sheet.href && !sheet.href.startsWith(location.origin)) continue;
          const rule = [...sheet.cssRules].find(
            (r) => r.selectorText === targetSelector,
          );
          if (rule) {
            rule.style.setProperty(cssVariable, event.target.value + unit);
            break;
          }
        } catch (_) {
          // skip cross-origin sheets
        }
      }
    });
  }
}

customElements.define("control-input", ControlInput);
