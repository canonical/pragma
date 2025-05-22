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
export default function throttle(func, wait) {
    let timer = null;
    return function (...args) {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}
//# sourceMappingURL=throttle.js.map