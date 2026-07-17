/**
 * Runtime validation of capability modules against the grammar.
 *
 * zod lives here (and only in the few registration seams the conventions
 * name) so it never reaches the `--help`/`__complete` fast path: this module
 * is imported lazily, at boot/registration, to fail fast on a malformed spec.
 * It validates the *data* shape of the grammar — paths, params, capability,
 * MCP exposure — and asserts the function-valued fields are functions.
 */

import { z } from "zod";
import type { CapabilityModule } from "./types.js";

const fn = z.custom<(...args: unknown[]) => unknown>(
  (value) => typeof value === "function",
  { message: "expected a function" },
);

const paramCompleteSchema = z.union([
  z.object({ kind: z.literal("values") }),
  z.object({ kind: z.literal("entity"), type: z.string() }),
  z.object({ kind: z.literal("files") }),
  z.object({ kind: z.literal("none") }),
]);

const positionalFields = {
  name: z.string().min(1),
  doc: z.string(),
  required: z.boolean().optional(),
  positional: z.boolean().optional(),
  complete: paramCompleteSchema.optional(),
};

const paramSpecSchema = z.union([
  z.object({
    ...positionalFields,
    kind: z.enum(["string", "boolean", "number"]),
    default: z.unknown().optional(),
  }),
  z.object({
    ...positionalFields,
    kind: z.literal("enum"),
    values: z.array(z.string()).min(1),
    default: z.string().optional(),
  }),
  z.object({ ...positionalFields, kind: z.literal("string[]") }),
]);

const mcpAnnotationsSchema = z.object({
  readOnlyHint: z.boolean(),
  destructiveHint: z.boolean().optional(),
  openWorldHint: z.boolean(),
});

const capabilitySchema = z.object({
  needsStore: z.boolean(),
  mutates: z.boolean(),
  destructive: z.boolean().optional(),
  needsNetwork: z.boolean().optional(),
  interactive: z.boolean().optional(),
  mcp: z.union([
    z.object({
      expose: z.literal(true),
      annotations: mcpAnnotationsSchema.optional(),
    }),
    z.object({ expose: z.literal(false), reason: z.string().min(1) }),
  ]),
});

const verbSpecSchema = z.object({
  path: z.tuple([z.string().min(1)]).rest(z.string()),
  summary: z.string().min(1),
  doc: z.string().optional(),
  params: z.array(paramSpecSchema),
  output: z.object({
    schema: z.unknown().optional(),
    formatters: z.object({ plain: fn, llm: fn, json: fn }),
  }),
  examples: z
    .array(z.object({ cmd: z.string(), note: z.string().optional() }))
    .optional(),
  disclosure: z
    .object({ levels: z.array(z.string()), default: z.string() })
    .optional(),
  capability: capabilitySchema,
  run: fn,
  errors: z.array(z.object({ code: z.string(), when: z.string() })).optional(),
  hidden: z.boolean().optional(),
});

const moduleSchema = z.object({
  name: z.string().min(1),
  verbs: z.array(verbSpecSchema).min(1),
  boot: fn.optional(),
});

/**
 * Validate a capability module against the grammar, throwing on the first
 * malformation.
 *
 * @param module - The capability module to validate.
 * @throws Error describing the first schema violation.
 */
export function validateModule(module: CapabilityModule): void {
  const result = moduleSchema.safeParse(module);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "<root>";
    throw new Error(
      `invalid capability module "${module?.name ?? "?"}" at ${path}: ${issue?.message ?? "unknown error"}`,
    );
  }
}
