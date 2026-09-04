import { useRouterState } from "@canonical/router-react";
import type React from "react";
import LensBreadcrumbs from "./LensBreadcrumbs.js";
import type { LensRouteName } from "./types.js";

/**
 * Build a lens's mode-strip `Context` tenant: the breadcrumb trail to the
 * current page, parked on the lens's routes under `SHELL_STRIP_META_KEY`
 * and mounted by the Shell into the strip's `context` socket.
 *
 * One factory serves every lens (M-STRUCT: one component, parameterised,
 * not five near-identical ones). It reads the CURRENT route param — the
 * entity/term/reading identity — straight off the router match, so the
 * terminal crumb is URL-derived: no Relay query, no fetch, no suspension of
 * the frame, and byte-identical markup on the server and the client (the
 * SSR-determinism the strip's tenants must honour).
 *
 * - `lensLabel` / `lensRouteName`: the constant first crumb (the lens name,
 *   and the index route the back-link points at).
 * - `paramKey`: the route param naming the current entity (`uri`, `term`,
 *   `job`). Absent on the lens index — then the trail is the single lens
 *   crumb, marked current. When present, its raw value (a prefixed URI or
 *   slug, percent-decoded by the router codec) is the terminal crumb text:
 *   the honest identity the URL already carries, not a fetched display name.
 *
 * Home takes no `paramKey`: it has one address and one crumb.
 */
export const makeLensContext = ({
  lensLabel,
  lensRouteName,
  paramKey,
}: {
  readonly lensLabel: string;
  readonly lensRouteName: LensRouteName;
  readonly paramKey?: string;
}): (() => React.ReactElement) => {
  const LensContext = (): React.ReactElement => {
    const { match } = useRouterState();
    const params =
      match?.kind === "route"
        ? ((match.params ?? {}) as Readonly<Record<string, unknown>>)
        : {};
    const raw = paramKey === undefined ? undefined : params[paramKey];
    const current = typeof raw === "string" && raw.length > 0 ? raw : undefined;

    return (
      <LensBreadcrumbs
        current={current}
        lensLabel={lensLabel}
        lensRouteName={lensRouteName}
      />
    );
  };
  return LensContext;
};

export default makeLensContext;
