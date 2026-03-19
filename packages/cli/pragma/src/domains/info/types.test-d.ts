/**
 * Compile-time type tests for info + upgrade domain types.
 *
 * Checked by `tsc --noEmit`, not executed at runtime.
 */

import { expectTypeOf } from "expect-type";
import type {
  InfoData,
  RegistryCheckResult,
  StoreSummary,
  UpgradeData,
} from "./types.js";

// InfoData
expectTypeOf<InfoData["version"]>().toBeString();
expectTypeOf<InfoData["pm"]>().toBeString();
expectTypeOf<InfoData["tier"]>().toEqualTypeOf<string | undefined>();
expectTypeOf<InfoData["tierChain"]>().toEqualTypeOf<readonly string[]>();
expectTypeOf<InfoData["updateSkipped"]>().toBeBoolean();

// UpgradeData
expectTypeOf<UpgradeData["current"]>().toBeString();
expectTypeOf<UpgradeData["latest"]>().toEqualTypeOf<string | undefined>();
expectTypeOf<UpgradeData["dryRun"]>().toBeBoolean();
expectTypeOf<UpgradeData["offline"]>().toBeBoolean();
expectTypeOf<UpgradeData["executed"]>().toBeBoolean();

// RegistryCheckResult
expectTypeOf<RegistryCheckResult["latest"]>().toBeString();
expectTypeOf<RegistryCheckResult["distTag"]>().toBeString();

// StoreSummary
expectTypeOf<StoreSummary["tripleCount"]>().toBeNumber();
expectTypeOf<StoreSummary["graphNames"]>().toEqualTypeOf<readonly string[]>();
