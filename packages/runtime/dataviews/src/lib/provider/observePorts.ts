import type { PortsObservation, PortsObservationConfig } from "./types.js";

/**
 * One ref-counted observation over several ports: the first observer
 * starts every port in order and the last release stops them in reverse,
 * so no port sees a transition another port's stop caused. Each release
 * counts once, however often it is called, so a second call from one
 * observer never releases another's hold.
 *
 * A port that cannot start — a location whose write throws — leaves the
 * ones before it stopped, not running for nobody, and the observer whose
 * start failed holds nothing.
 *
 * @note Impure by design: observing starts the ports, which subscribe.
 */
export default function observePorts(
  config: PortsObservationConfig,
): PortsObservation {
  const { ports, afterStart } = config;
  let observers = 0;
  let stopAll: (() => void) | null = null;

  const start = (): (() => void) => {
    const stops: (() => void)[] = [];
    const stopStarted = (): void => {
      for (const stop of stops.reverse()) {
        stop();
      }
    };
    try {
      for (const port of ports) {
        stops.push(port.observe());
      }
    } catch (error) {
      stopStarted();
      throw error;
    }
    afterStart();
    return stopStarted;
  };

  return {
    observe(): () => void {
      observers += 1;
      if (observers === 1) {
        try {
          stopAll = start();
        } catch (error) {
          observers -= 1;
          throw error;
        }
      }
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        observers -= 1;
        if (observers === 0) {
          stopAll?.();
          stopAll = null;
        }
      };
    },
    get observers() {
      return observers;
    },
  };
}
