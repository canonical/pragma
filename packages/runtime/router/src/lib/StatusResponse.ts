/** Typed non-success status value that can be thrown from router fetches. */
export default class StatusResponse<TData = unknown> {
  readonly status: number;
  readonly data: TData;

  constructor(
    status: number,
    // The payload is optional only when TData admits undefined (including the
    // default `unknown`): `new StatusResponse(401)` works, while
    // `new StatusResponse<{ message: string }>(401)` is a compile error —
    // `.data` can never lie about being present.
    ...payload: undefined extends TData ? [data?: TData] : [data: TData]
  ) {
    this.status = status;
    this.data = payload[0] as TData;
  }
}
