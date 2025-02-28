export interface UseDelayedOpenProps {
  /**
   * Delay in milliseconds before showing the element.
   * Defaults to 350ms.
   */
  showDelay?: number;
  /**
   * Delay in milliseconds before hiding the element.
   * Defaults to 350ms.
   */
  hideDelay?: number;
}

export interface UseDelayedOpenResult {
  isVisible: boolean;
  open: () => void;
  close: () => void;
}
