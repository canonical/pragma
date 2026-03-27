import type { ListParams } from "../shared/contracts.js";
import type {
  Disclosure,
  StandardDetailed,
  StandardListFilters,
  StandardSummary,
} from "../shared/types/index.js";

export interface StandardListResolution {
  readonly params: ListParams & StandardListFilters;
  readonly items: readonly StandardSummary[];
  readonly filters: StandardListFilters;
  readonly disclosure: Disclosure;
  readonly details?: readonly (StandardDetailed | null)[];
}
