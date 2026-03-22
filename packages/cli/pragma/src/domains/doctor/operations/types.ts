/** Result of a single doctor check. */
export interface CheckResult {
  readonly name: string;
  readonly status: "pass" | "fail" | "skip";
  readonly detail: string;
  readonly remedy?: string;
}

/** Context passed to each doctor check, providing the working directory. */
export interface CheckContext {
  readonly cwd: string;
}

/** Aggregated results from all doctor checks. */
export interface DoctorData {
  readonly checks: readonly CheckResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}
