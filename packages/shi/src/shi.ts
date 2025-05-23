import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { type LLMInstance, type Operation, operations } from "./operations.js";

type LLMProvider = "openai" | "anthropic";

const getLLM = (provider: string, model?: string): LLMInstance => {
  switch (provider as LLMProvider) {
    case "openai":
      return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: model || "gpt-4.1-mini",
      });
    case "anthropic":
      return new ChatAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        modelName: model || "claude-opus-4-20250514",
      });
    default:
      throw new Error(
        `Unsupported LLM provider: ${provider}. Available: openai, anthropic`,
      );
  }
};

const mapShorthands = (
  op: Operation,
  options: Record<string, string>,
): Record<string, string> => {
  const shorthandMap = Object.fromEntries(
    op.options.map((opt) => [opt.shorthand, opt.name]),
  );
  return Object.fromEntries(
    Object.entries(options).map(([key, value]) => [
      shorthandMap[key] || key,
      value,
    ]),
  );
};

// Create properly typed shi object
type ShiType = {
  [K in keyof typeof operations]: {
    [O in keyof (typeof operations)[K]]: (
      options: Record<string, string>,
    ) => Promise<unknown>;
  };
};

export const shi: ShiType = Object.fromEntries(
  Object.entries(operations).map(([entity, ops]) => [
    entity,
    Object.fromEntries(
      Object.entries(ops).map(([opName, op]) => [
        opName,
        async (options: Record<string, string>) => {
          const {
            provider = "openai",
            model,
            ...opOptions
          } = mapShorthands(op, options);

          const llm = getLLM(provider, model);
          return op.execute(llm, opOptions);
        },
      ]),
    ),
  ]),
) as ShiType;
