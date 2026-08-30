import { createRouteCodec } from "./pathUtils.js";
import type {
  AnyWrapper,
  DataRouteDefinition,
  DataRouteInput,
  InferParams,
  ParamNames,
  RedirectRouteDefinition,
  RedirectRouteInput,
  RouteDefinition,
  RouteInput,
  StandardSchemaV1,
} from "./types.js";

/**
 * The error message for one `:param` segment carrying modifier grammar
 * whose semantics the router never honors, or `never` for a plain segment.
 *
 * `TSubject` names where the segment sits ("route path param" /
 * "redirect target param") and `TVerb` the operation the modifier can
 * never survive ("matches" / "renders"), so both diagnostic families stay
 * one taxonomy with one remedy clause.
 */
type ParamModifierError<
  TSegment extends string,
  TSubject extends string,
  TVerb extends string,
> = TSegment extends `:${infer TParam}`
  ? TParam extends `${infer TName}(${string}`
    ? `${TSubject} ':${TName}' uses a regex group, which the router never ${TVerb}; use a plain ':${TName}' segment`
    : TParam extends `${infer TName}?`
      ? `${TSubject} ':${TName}' uses the '?' optional modifier, which the router never ${TVerb}; use a plain ':${TName}' segment`
      : TParam extends `${infer TName}*`
        ? `${TSubject} ':${TName}' uses the '*' repeat modifier, which the router never ${TVerb}; use a plain ':${TName}' segment`
        : TParam extends `${infer TName}+`
          ? `${TSubject} ':${TName}' uses the '+' repeat modifier, which the router never ${TVerb}; use a plain ':${TName}' segment`
          : never
  : never;

/**
 * The error message for one path segment using param-modifier grammar the
 * router never matches, or `never` for a segment it does match.
 */
type PathSegmentError<TSegment extends string> = ParamModifierError<
  TSegment,
  "route path param",
  "matches"
>;

/** Every segment error in a path pattern, as a union of message literals. */
type PathError<TPath extends string> =
  TPath extends `${infer TSegment}/${infer TRest}`
    ? PathSegmentError<TSegment> | PathError<TRest>
    : PathSegmentError<TPath>;

/**
 * Compile-time validation of a route path pattern.
 *
 * Resolves to `unknown` — an identity inside an intersection — when the
 * pattern uses only grammar the router matches: static segments, `:param`
 * segments, and a trailing `*` wildcard. When a param segment carries a
 * `?`/`*`/`+`/`(regex)` modifier, resolves instead to an object requiring a
 * property whose name states the error, so the mistake surfaces as a
 * missing-property diagnostic on the `route()` call.
 */
export type ValidPath<TPath extends string> = [PathError<TPath>] extends [never]
  ? unknown
  : { readonly [TKey in PathError<TPath>]: TKey };

/**
 * The error message for one redirect-target segment, or `never` for a
 * segment the router can render: a `:param` carrying a modifier is faulted
 * for the modifier itself (the same treatment {@link ValidPath} gives a
 * path param), and only a plain `:param` is checked against the params the
 * route's own path provides.
 */
type TargetSegmentError<TPath extends string, TSegment extends string> = [
  ParamModifierError<TSegment, "redirect target param", "renders">,
] extends [never]
  ? TSegment extends `:${infer TParam}`
    ? TParam extends ParamNames<TPath>
      ? never
      : `redirect target references param ':${TParam}' that path '${TPath}' does not provide; add ':${TParam}' to the path or remove it from the target`
    : never
  : ParamModifierError<TSegment, "redirect target param", "renders">;

/** Every segment error in a redirect target, as a union of literals. */
type TargetError<
  TPath extends string,
  TTarget extends string,
> = TTarget extends `${infer TSegment}/${infer TRest}`
  ? TargetSegmentError<TPath, TSegment> | TargetError<TPath, TRest>
  : TargetSegmentError<TPath, TTarget>;

/**
 * Compile-time validation of a redirect route's target pattern.
 *
 * A redirect target is rendered with the params matched from the route's
 * own path, so a target `:param` must be modifier-free and must appear in
 * the path. Resolves to `unknown` when the target is renderable, otherwise
 * to an object requiring a property whose name states the fault, so the
 * mistake surfaces as a missing-property diagnostic on the `route()` call.
 */
export type RedirectTarget<TPath extends string, TTarget extends string> = [
  TargetError<TPath, TTarget>,
] extends [never]
  ? unknown
  : { readonly [TKey in TargetError<TPath, TTarget>]: TKey };

/**
 * The schema constraint for a route's `params` field: a Standard Schema
 * whose output covers every `:param` name in the path, so `render()` can
 * substitute each pattern segment from the schema's output.
 */
export type ParamsSchemaFor<TPath extends string> = StandardSchemaV1<
  unknown,
  { readonly [TParam in ParamNames<TPath>]: unknown }
>;

function isRedirectRouteInput<
  TPath extends string,
  TWrappers extends readonly AnyWrapper[],
>(
  definition: RouteInput<TPath, undefined, unknown, TWrappers>,
): definition is RedirectRouteInput<TPath, string, TWrappers> {
  return "redirect" in definition;
}

/**
 * Construct a flat route triplet and derive its path codec.
 *
 * The path pattern is validated at the type level ({@link ValidPath}), a
 * params schema must cover the pattern's `:param` names
 * ({@link ParamsSchemaFor}), and a redirect target may only reference
 * params the pattern provides ({@link RedirectTarget}). The declared
 * return types wrap the schema arguments in `NoInfer` so a schema-less
 * route defined inline inside a router factory keeps its path-derived
 * types instead of collapsing to the generic constraints. The wrapper
 * list is left uninstrumented: a leaked `NoInfer` marker there blocks the
 * route map from ever being inferred back out of a match function. Both
 * directions are pinned by mutation-tested assertions in
 * `types.types.test.ts` ("router surface").
 */
export default function route<
  const TPath extends string,
  TTarget extends string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends ParamsSchemaFor<TPath> | undefined = undefined,
>(
  definition: RedirectRouteInput<TPath, TTarget, TWrappers, TParamsSchema> &
    ValidPath<TPath> &
    RedirectTarget<TPath, TTarget>,
): RedirectRouteDefinition<TPath, TTarget, TWrappers, NoInfer<TParamsSchema>>;
export default function route<
  const TPath extends string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends ParamsSchemaFor<TPath> | undefined = undefined,
>(
  definition: DataRouteInput<
    TPath,
    TSearchSchema,
    TRendered,
    TWrappers,
    TParamsSchema
  > &
    ValidPath<TPath>,
): DataRouteDefinition<
  TPath,
  NoInfer<TSearchSchema>,
  TRendered,
  TWrappers,
  NoInfer<TParamsSchema>
>;
export default function route<
  const TPath extends string,
  TSearchSchema extends StandardSchemaV1 | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends StandardSchemaV1 | undefined = undefined,
>(
  definition: RouteInput<
    TPath,
    TSearchSchema,
    TRendered,
    TWrappers,
    TParamsSchema
  >,
): RouteDefinition<TPath, TSearchSchema, TRendered, TWrappers, TParamsSchema> {
  const codec = createRouteCodec(definition.url, definition.params);

  if (
    isRedirectRouteInput(
      definition as RouteInput<TPath, undefined, unknown, TWrappers>,
    )
  ) {
    return {
      ...definition,
      wrappers: (definition.wrappers ?? []) as TWrappers,
      parse(input: string | URL) {
        return codec.parse(input) as InferParams<TPath, TParamsSchema> | null;
      },
      render(params: InferParams<TPath, TParamsSchema>) {
        return codec.render(params as Readonly<Record<string, unknown>>);
      },
    };
  }

  return {
    ...definition,
    wrappers: (definition.wrappers ?? []) as TWrappers,
    parse(input: string | URL) {
      return codec.parse(input) as InferParams<TPath, TParamsSchema> | null;
    },
    render(params: InferParams<TPath, TParamsSchema>) {
      return codec.render(params as Readonly<Record<string, unknown>>);
    },
  };
}
