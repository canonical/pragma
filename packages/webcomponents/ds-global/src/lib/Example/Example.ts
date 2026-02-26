import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import styles from "./styles.css";
import type { BaseProps } from "./types.js";

const componentCssClassName = "ds example";

/**
 * Example component demonstrating the structure and patterns for
 * Lit web components in this package.
 *
 * Shows how to:
 * - Use separate styles.css and types.ts files
 * - Handle properties with decorators
 * - Use slots for content projection
 *
 * @example
 * ```html
 * <ds-example label="Click me"></ds-example>
 * ```
 *
 * @implements ds:global.component.example
 */
@customElement("ds-example")
export default class Example extends LitElement implements BaseProps {
  static styles = styles;

  /**
   * The label text to display
   */
  @property({ type: String })
  label = "Example";

  /**
   * Display variant
   */
  @property({ type: String })
  variant?: BaseProps["variant"];

  render() {
    const classes = [componentCssClassName, this.variant]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class="${classes}">
        <slot>${this.label}</slot>
      </div>
    `;
  }
}
