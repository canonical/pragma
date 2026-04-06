import Redirect from "./Redirect.js";

/** Throw a redirect value with an optional HTTP redirect status code. */
export default function redirect(
  to: string,
  status: 301 | 302 | 307 | 308 = 302,
): never {
  throw new Redirect(to, status);
}
