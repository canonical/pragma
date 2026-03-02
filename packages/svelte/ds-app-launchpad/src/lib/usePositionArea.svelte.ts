import { autoUpdate, computePosition, flip } from "@floating-ui/dom";
import type {
  ComputePositionConfig,
  ComputePositionReturn,
  Placement,
} from "@floating-ui/dom";
import type { Attachment } from "svelte/attachments";
import { useIsMounted } from "./useIsMounted.svelte.js";

export const positionAreaFallbackMap = {
  /*
  
  +---+---+---+
  | 1 | 2 | 3 |
  +---+---+---+
  | 4 |   | 5 |
  +---+---+---+
  | 6 | 7 | 8 |
  +---+---+---+
  
  */
  "block-start": "top", // spans 1, 2, 3
  "block-end": "bottom", // spans 6, 7, 8
  "block-start span-inline-start": "top-end", // spans 1, 2
  "block-start span-inline-end": "top-start", // spans 2, 3
  "block-end span-inline-start": "bottom-end", // spans 6, 7
  "block-end span-inline-end": "bottom-start", // spans 7, 8
  "inline-start": "left", // spans 1, 4, 6
  "inline-end": "right", // spans 3, 5, 8
  "inline-start span-block-start": "left-end", // spans 1, 4
  "inline-start span-block-end": "left-start", // spans 4, 6
  "inline-end span-block-start": "right-end", // spans 3, 5
  "inline-end span-block-end": "right-start", // spans 5, 8
} as const satisfies Record<string, Placement>;

export type PositionArea = keyof typeof positionAreaFallbackMap;

/**
 * A subset of `position-try-fallbacks` values that should cover the most common fallback strategies.
 */
export type PositionTryFallbacks =
  | "flip-inline"
  | "flip-block"
  | "flip-inline flip-block"
  | "flip-inline, flip-block"
  | "flip-block, flip-inline"
  | "flip-inline, flip-inline flip-block"
  | "flip-block, flip-inline flip-block"
  | "flip-inline, flip-block, flip-inline flip-block"
  | "flip-block, flip-inline, flip-inline flip-block";

/**
 * Allows to position a floating target relative to a trigger using CSS `position-area` when available, and automatically falls back to Floating UI when unsupported.
 *
 * Usage:
 * - Attach `triggerAttachment` to the trigger element and `targetAttachment` to the target element you wish to position.
 * - Provide the style returned by `targetStyle()` to the target element.
 * - Control activation via `getActive()`, the desired placement via `getPosition()` and optionally position fallback behavior via `getTryFallbacks()`.
 *
 * @param getPosition - Returns the desired position-area value.
 * @param getActive - Returns whether positioning should be active.
 * @param getTryFallbacks - Optionally returns a position-try-fallbacks value.
 * @returns Attachments to be applied to the trigger and target elements and the target style getter.
 */
export function usePositionArea(
  getPosition: () => PositionArea,
  getActive: () => boolean,
  getTryFallbacks?: () => PositionTryFallbacks | undefined,
) {
  const isMounted = useIsMounted();
  const needsFallback = $derived.by(() => {
    if (!isMounted.value) return false;

    const position = getPosition();
    const tryFallback = getTryFallbacks?.();

    return (
      !CSS.supports("position-area", position) ||
      // Some versions of Firefox and Chrome seem to report support for `inline-start` and `inline-end`, but they don't actually position the element properly. For now, force the fallback for these values.
      position.startsWith("inline") ||
      (tryFallback !== undefined &&
        !CSS.supports("position-try-fallbacks", tryFallback))
    );
  });

  const isFloatingUiActive = $derived(needsFallback && getActive());
  const floatingUIConfig = $derived.by(() => {
    const position = getPosition();
    const tryFallback = getTryFallbacks?.();

    if (!tryFallback) {
      return {
        placement: positionAreaFallbackMap[position],
      };
    }

    const crossAxis =
      (position.startsWith("block") && tryFallback.includes("flip-inline")) ||
      (position.startsWith("inline") && tryFallback.includes("flip-block"));

    return {
      placement: positionAreaFallbackMap[position],
      middleware: [
        // This doesn't 100% match the native CSS behavior, but should be close enough for most use cases.
        flip({
          mainAxis:
            (position.startsWith("block") &&
              tryFallback.includes("flip-block")) ||
            (position.startsWith("inline") &&
              tryFallback.includes("flip-inline")),
          crossAxis,
          flipAlignment: crossAxis,
        }),
      ],
    };
  });

  let fallbackStyle = $state<string>("");

  const { triggerAttachment, targetAttachment } = useFloatingUI(
    () => isFloatingUiActive,
    () => floatingUIConfig,
    ({ x, y }) => {
      fallbackStyle = `position: absolute; left: ${x}px; top: ${y}px;`;
    },
  );

  const targetStyle = $derived.by(() => {
    if (needsFallback && fallbackStyle) {
      return fallbackStyle;
    }
    const tryFallback = getTryFallbacks?.();
    return `position-area: ${getPosition()};${tryFallback ? ` position-try-fallbacks: ${tryFallback};` : ""}`;
  });

  return {
    triggerAttachment,
    targetAttachment,
    targetStyle: () => targetStyle,
  };
}

/**
 * Helper around Floating UI to compute and update the position of a floating target relative to a trigger element.
 *
 * It wires up `autoUpdate`, calls `computePosition` on updates, and forwards the result to the provided callback.
 *
 * Usage:
 * - Attach `triggerAttachment` to the trigger element and `targetAttachment` to the target element you wish to position.
 * - Control activation via `getActive()` and supply options via `getOptions()`.
 *
 * @param getActive - Returns whether positioning should be active.
 * @param getOptions - Supplies options for `computePosition`. If `undefined`, defaults will be used.
 * @param callback - Invoked with the latest computed position.
 * @returns Attachments to be applied to the trigger and target elements.
 */
export function useFloatingUI(
  getActive: () => boolean,
  getOptions: () => Partial<ComputePositionConfig> | undefined,
  callback: (value: ComputePositionReturn) => void,
) {
  let triggerRef = $state<HTMLElement>();
  let targetRef = $state<HTMLElement>();

  const triggerAttachment: Attachment<HTMLElement> = (node) => {
    triggerRef = node;
    return () => (triggerRef = undefined);
  };

  const targetAttachment: Attachment<HTMLElement> = (node) => {
    targetRef = node;
    return () => (targetRef = undefined);
  };

  $effect(() => {
    if (!getActive()) return;
    if (!triggerRef || !targetRef) return;
    const options = getOptions();

    const cleanup = autoUpdate(triggerRef, targetRef, () => {
      if (!triggerRef || !targetRef) return;
      computePosition(triggerRef, targetRef, options).then(callback);
    });

    return () => {
      cleanup();
    };
  });

  return {
    triggerAttachment,
    targetAttachment,
  };
}
