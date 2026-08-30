/** Typed non-success status value that can be thrown from router fetches. */
export default class StatusResponse<TData = unknown> {
  readonly status: number;
  readonly data: TData;

  constructor(status: number, data: TData) {
    this.status = status;
    this.data = data;
  }
}
