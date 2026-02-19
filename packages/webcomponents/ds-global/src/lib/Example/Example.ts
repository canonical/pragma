import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * Basic example web component.
 *
 * This serves as a minimal example to demonstrate the structure
 * of a Lit web component in this package. It should be removed once real
 * components are implemented.
 *
 * @example
 * ```html
 * <my-element></my-element>
 * ```
 */
@customElement("my-element")
export class MyElement extends LitElement {
  render() {
    return html`
    <p>This is a web component</p>
    `;
  }
}
