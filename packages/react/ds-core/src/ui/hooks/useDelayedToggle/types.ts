export interface UseDelayedToggleProps {
  /**
   * Delay in milliseconds before setting the flag to true
   * Defaults to 150ms.
   */
  activateDelay?: number;
  /**
   * Delay in milliseconds before setting the flag to false
   * Defaults to 150ms.
   */
  deactivateDelay?: number;

  /** A callback to be called when the flag is set to true. */
  onActivate?: DelayedToggleActivateEventHandler;
  /** A callback to be called when the flag is set to false. */
  onDeactivate?: DelayedToggleActivateEventHandler;
}

export interface UseDelayedToggleResult {
  /** The current state of the flag. */
  flag: boolean;
  /** Sets the flag to true after the specified delay. */
  activate: DelayedToggleActivateEventHandler;
  /** Sets the flag to false after the specified delay. */
  deactivate: DelayedToggleActivateEventHandler;
}

/** Event handler for delayed toggle activation events. */
export type DelayedToggleActivateEventHandler = (event: Event) => void;
