/**
 * Throttles a function invocation to at most once every `wait` milliseconds.
 * @template T The type of the function to throttle
 * @param func - The function to throttle
 * @param wait - The time in milliseconds to wait between invocations
 * @returns A throttled version of the function
 * @see Throttling function calls, by Remy Sharp
 *  http://remysharp.com/2010/07/21/throttling-function-calls/
 *
 * @example
 *
 * window.addEventListener(
 *   'resize',
 *   throttle(() => {
 *     console.log("window was resized!");
 *   }, 500)
 * );
 */
export default function throttle<
  T extends (...args: Parameters<T>) => ReturnType<T>,
>(func: T, wait: number): (...args: Parameters<T>) => void {
  let isThrottled = false;
  let lastArgs: Parameters<T> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (isThrottled) {
      lastArgs = args;
      return;
    }

    func.apply(this, args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
      if (lastArgs) {
        func.apply(this, lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
}
