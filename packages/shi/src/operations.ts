import type { AIMessage } from "@langchain/core/messages";

export interface LLMInstance {
  invoke: (messages: { role: string; content: string }[]) => Promise<AIMessage>;
}

// Template function type
type PromptTemplate = (params: Record<string, string>) => string;

// Helper to create template functions with validation
const createTemplate = (
  template: string,
  requiredParams: string[],
): PromptTemplate => {
  return (params: Record<string, string>) => {
    // Validate all required params are present
    const missing = requiredParams.filter((p) => !params[p]);
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(", ")}`);
    }

    // Replace all placeholders
    return template.replace(/{(\w+)}/g, (match, key) => {
      if (!(key in params)) {
        throw new Error(`Unknown parameter in template: ${key}`);
      }
      return params[key];
    });
  };
};

// Extract content from AIMessage
const extractContent = (message: AIMessage): string => {
  if (typeof message.content === "string") {
    return message.content;
  }
  return message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
};

export interface Operation {
  name: string;
  description: string;
  options: {
    name: string;
    shorthand: string;
    type: "string" | "file";
    required: boolean;
  }[];
  execute: (
    llm: LLMInstance,
    options: Record<string, string>,
  ) => Promise<unknown>;
}

// Specification prompts
const specificationPrompts = {
  create: createTemplate(
    `Given the RDF Turtle schema below, create a new RDF resource that:
1. Is an instance of an appropriate class from the schema
2. Has a URI of the form: http://syntax.example.org/data/{name}
3. Includes ds:name "{name}" and ds:description "{description}"
4. Conforms to all SHACL constraints in the schema
5. Uses appropriate properties based on the description. Use as many properties as possible to describe the resource, including requirements, affordances, etc.

Schema:
{schema}

Return ONLY valid RDF Turtle syntax, without quotes.`,
    ["name", "schema", "description"],
  ),

  improve: createTemplate(
    `Given this RDF Turtle specification and improvement request, generate an improved RDF specification that:
1. Maintains all existing semantic relationships and constraints
2. Addresses the specific improvement: {improvement}
3. Remains valid RDF Turtle syntax
4. Preserves all SHACL constraints
5. Enhances the specification based on the feedback while keeping backward compatibility

Current Specification:
{specification}

Return ONLY the improved RDF Turtle specification.`,
    ["specification", "improvement"],
  ),
};

// Implementation prompts
const implementationPrompts = {
  create: createTemplate(
    `Given this RDF Turtle specification, generate a {platform} component that:
1. Implements all properties (ds:props) defined in the specification
2. Supports all modifiers (ds:hasModifier) as component states/variants
3. Implements all affordances (ds:hasAffordance) with appropriate event handlers
4. Follows accessibility requirements (ds:hasRequirement)
5. Uses design tokens (ds:usesToken) for styling

Specification:
{specification}

Return ONLY the component code without any explanation.`,
    ["platform", "specification"],
  ),

  improve: createTemplate(
    `Given the RDF specification, current implementation, and improvement request, generate an improved {platform} component that:
1. Maintains all requirements from the RDF specification
2. Addresses the specific improvement: {improvement}
3. Preserves existing functionality from the current implementation
4. Ensures backward compatibility where possible
5. Follows best practices for the {platform} platform

RDF Specification:
{specification}

Current Implementation:
{implementation}

Improvement Request: {improvement}

Return ONLY the improved component code.`,
    ["specification", "implementation", "platform", "improvement"],
  ),

  verify: createTemplate(
    `Verify if the implementation correctly follows the RDF specification.

Check for:
1. All required properties (ds:props) are implemented
2. All modifiers (ds:hasModifier) are supported
3. Affordances (ds:hasAffordance) have corresponding event handlers
4. Accessibility requirements (ds:hasRequirement) are met
5. Design tokens (ds:usesToken) are used appropriately

Specification:
{specification}

Implementation:
{implementation}

Return "PASS" or "FAIL" followed by a detailed explanation.`,
    ["specification", "implementation"],
  ),
};

export const operations = {
  specification: {
    create: {
      name: "create",
      description: "Create a new specification in RDF Turtle format",
      options: [
        { name: "name", shorthand: "n", type: "string", required: true },
        { name: "schema", shorthand: "s", type: "file", required: true },
        { name: "description", shorthand: "d", type: "string", required: true },
      ],
      execute: async (llm: LLMInstance, options: Record<string, string>) => {
        const prompt = specificationPrompts.create(options);
        const response = await llm.invoke([{ role: "user", content: prompt }]);
        return extractContent(response).trim();
      },
    },
    improve: {
      name: "improve",
      description: "Improve an existing RDF specification based on feedback",
      options: [
        { name: "specification", shorthand: "s", type: "file", required: true },
        { name: "improvement", shorthand: "i", type: "string", required: true },
      ],
      execute: async (llm: LLMInstance, options: Record<string, string>) => {
        const prompt = specificationPrompts.improve(options);
        const response = await llm.invoke([{ role: "user", content: prompt }]);
        return extractContent(response).trim();
      },
    },
  },
  implementation: {
    create: {
      name: "create",
      description: "Create a new implementation from RDF specification",
      options: [
        { name: "specification", shorthand: "s", type: "file", required: true },
        { name: "platform", shorthand: "p", type: "string", required: true },
      ],
      execute: async (llm: LLMInstance, options: Record<string, string>) => {
        const prompt = implementationPrompts.create(options);
        const response = await llm.invoke([{ role: "user", content: prompt }]);
        return extractContent(response).trim();
      },
    },
    improve: {
      name: "improve",
      description:
        "Improve an existing implementation using its code, spec, and feedback",
      options: [
        { name: "specification", shorthand: "s", type: "file", required: true },
        {
          name: "implementation",
          shorthand: "c",
          type: "file",
          required: true,
        },
        { name: "platform", shorthand: "p", type: "string", required: true },
        { name: "improvement", shorthand: "i", type: "string", required: true },
      ],
      execute: async (llm: LLMInstance, options: Record<string, string>) => {
        const prompt = implementationPrompts.improve(options);
        const response = await llm.invoke([{ role: "user", content: prompt }]);
        return extractContent(response).trim();
      },
    },
    verify: {
      name: "verify",
      description: "Verify implementation against RDF specification",
      options: [
        { name: "specification", shorthand: "s", type: "file", required: true },
        {
          name: "implementation",
          shorthand: "i",
          type: "file",
          required: true,
        },
      ],
      execute: async (llm: LLMInstance, options: Record<string, string>) => {
        const prompt = implementationPrompts.verify(options);
        const response = await llm.invoke([{ role: "user", content: prompt }]);
        return extractContent(response).trim();
      },
    },
  },
} as const;
