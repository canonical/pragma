import type { TransitionConfig } from "svelte/transition";

// TODO(in-JS-tokens): This would not be necessary if we had in-JS design tokens.
/**
 * A Svelte transition that fades an element's opacity.
 * The duration and easing are controlled by CSS custom properties on the element.
 */
export function cssControlledFade(
  node: HTMLElement,
  params: {
    durationVar: `--${string}`;
    easingVar: `--${string}`;
  },
): TransitionConfig {
  const style = getComputedStyle(node);
  const opacity = Number(style.opacity);
  const durationMs = parseCssDuration(
    style.getPropertyValue(params.durationVar),
  );
  const easingValue = style.getPropertyValue(params.easingVar).trim();

  // We directly set the animation-timing-function on the element so that we don't have to parse the easing function string.
  if (easingValue) {
    node.style.animationTimingFunction = easingValue;
  }

  return {
    duration: durationMs,
    css: (t) => `opacity: ${t * opacity}`,
  };
}

/**
 * Parses a CSS duration string (e.g., "500ms", "0.8s") into a number of milliseconds.
 * @param durationCSS The duration string from the CSS custom property.
 * @returns The duration in milliseconds.
 */
function parseCssDuration(durationCSS: string): number {
  durationCSS = durationCSS.trim();
  if (!durationCSS) return 0; // A sensible default duration

  const time = parseFloat(durationCSS);
  if (Number.isNaN(time) || time < 0) return 0;

  if (durationCSS.endsWith("ms")) {
    return time;
  }

  if (durationCSS.endsWith("s")) {
    return time * 1000;
  }

  return 0;
}
