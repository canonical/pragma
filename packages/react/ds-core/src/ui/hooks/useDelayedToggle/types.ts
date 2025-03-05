export interface UseDelayedToggleProps {
  /**
   * Delay in milliseconds before setting the flag to true
   * Defaults to 350ms.
   */
  activateDelay?: number;
  /**
   * Delay in milliseconds before setting the flag to false
   * Defaults to 350ms.
   */
  deactivateDelay?: number;
}

export interface UseDelayedToggleResult {
  flag: boolean;
  activate: () => void;
  deactivate: () => void;
}
