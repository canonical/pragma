import { createRouteCodec } from "./pathUtils.js";
import type {
  AnyWrapper,
  DataRouteDefinition,
  DataRouteInput,
  InferParams,
  RedirectRouteDefinition,
  RedirectRouteInput,
  RouteDefinition,
  RouteInput,
  SchemaLike,
} from "./types.js";

function isRedirectRouteInput<
  TPath extends string,
  TWrappers extends readonly AnyWrapper[],
>(
  definition: RouteInput<TPath, undefined, unknown, TWrappers>,
): definition is RedirectRouteInput<TPath, string, TWrappers> {
  return "redirect" in definition;
}

/** Construct a flat route triplet and derive its path codec. */
export default function route<
  const TPath extends string,
  TTarget extends string,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
>(
  definition: RedirectRouteInput<TPath, TTarget, TWrappers, TParamsSchema>,
): RedirectRouteDefinition<TPath, TTarget, TWrappers, TParamsSchema>;
export default function route<
  const TPath extends string,
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
>(
  definition: DataRouteInput<
    TPath,
    TSearchSchema,
    TRendered,
    TWrappers,
    TParamsSchema
  >,
): DataRouteDefinition<
  TPath,
  TSearchSchema,
  TRendered,
  TWrappers,
  TParamsSchema
>;
export default function route<
  const TPath extends string,
  TSearchSchema extends SchemaLike<unknown> | undefined = undefined,
  TRendered = unknown,
  TWrappers extends readonly AnyWrapper[] = readonly [],
  TParamsSchema extends SchemaLike<unknown> | undefined = undefined,
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
