/**
 * Types for the doctor domain.
 *
 * @see IN.07 in B.11.INSTALL
 */

export interface CheckResult {
  readonly name: string;
  readonly status: "pass" | "fail" | "skip";
  readonly detail: string;
  readonly remedy?: string;
}

export interface CheckContext {
  readonly cwd: string;
}

export interface DoctorData {
  readonly checks: readonly CheckResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
}
