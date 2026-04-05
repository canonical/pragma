/** Throwable redirect value used to short-circuit navigation. */
export default class RouteRedirect {
  readonly to: string;
  readonly status: 301 | 302 | 307 | 308;

  constructor(to: string, status: 301 | 302 | 307 | 308 = 302) {
    this.to = to;
    this.status = status;
  }
}
