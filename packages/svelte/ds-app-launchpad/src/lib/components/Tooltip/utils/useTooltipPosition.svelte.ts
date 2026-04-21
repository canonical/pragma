import type { ComputePositionConfig, Placement } from "@floating-ui/dom";
import { flip, offset } from "@floating-ui/dom";
import {
  type PositionArea,
  positionAreaFallbackMap,
  useFloatingUI,
} from "../../../useFunctions/usePositionArea.svelte.js";

/**
 * Compute reactive tooltip positioning using Floating UI, with optional automatic flipping.
 *
 * @param getActive - Getter indicating if the tooltip should currently be positioned.
 * @param getPosition - Getter returning the preferred logical position area.
 * @param getAutoAdjust - Getter determining whether the tooltip may flip to remain in viewport.
 * @param distanceToTrigger - Pixel offset distance between trigger element and tooltip.
 * @returns
 *  - triggerAttachment - Attachment to be applied to the tooltip trigger element.
 *  - targetAttachment - Attachment to be applied to the tooltip target element.
 *  - tooltipPosition - Reactive style object containing the current position of the tooltip.
 *  - getTooltipPlacement - Getter for the current placement of the tooltip (after any auto-adjustment).
 */
export function useTooltipPosition(
  getActive: () => boolean,
  getPosition: () => PositionArea,
  getAutoAdjust: () => boolean,
  distanceToTrigger: number,
) {
  const tooltipPosition = $state({ top: "auto", left: "auto" });
  let tooltipPlacement = $derived<Placement>(
    positionAreaFallbackMap[getPosition()],
  );

  const floatingUiConfig = $derived<Partial<ComputePositionConfig>>({
    placement: positionAreaFallbackMap[getPosition()],
    middleware: [
      offset(distanceToTrigger),
      getAutoAdjust() &&
        flip({
          fallbackAxisSideDirection: "start",
        }),
    ],
  });
  const { triggerAttachment, targetAttachment } = useFloatingUI(
    getActive,
    () => floatingUiConfig,
    ({ x, y, placement }) => {
      tooltipPosition.top = `${y}px`;
      tooltipPosition.left = `${x}px`;
      tooltipPlacement = placement;
    },
  );

  return {
    triggerAttachment,
    targetAttachment,
    tooltipPosition,
    getTooltipPlacement: () => tooltipPlacement,
  };
}
