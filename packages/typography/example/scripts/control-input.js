/**
 * <control-input> – numeric input for CSS variable control.
 *
 * Attributes:
 *   label, min, max, step, value, target-selector, css-variable, unit
 */
class ControlInput extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute("label");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const step = this.getAttribute("step");
    const value = this.getAttribute("value");
    const targetSelector = this.getAttribute("target-selector");
    const cssVariable = this.getAttribute("css-variable");
    const unit = this.getAttribute("unit") || "";

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
