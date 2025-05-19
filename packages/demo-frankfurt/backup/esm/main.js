#!/usr/bin/env bun
import * as fs from "node:fs";
import OpenAI from "openai";
// Initialize OpenAI client (assumes API_KEY is set in environment)
const openai = new OpenAI({ apiKey: process.env.API_KEY });
// Platform extensions
const PLATFORM_EXTENSIONS = {
    react: "tsx",
    svelte: "svelte",
};
// Prompt templates for LLM
const PROMPT_IDS = {
    specification_create: 'Given the following JSON schema: {schema}, the component name: {name}, and the description: {description}, generate a JSON object that conforms to the schema, includes the "name" field set to "{name}", and matches the description. Return only the JSON object.',
    implementation_create: "Generate a {platform} component that conforms to the following specification: {specification}. Return only the code.",
    implementation_improve: "Generate an improved {platform} component that conforms to the following specification: {specification} and also addresses the following: {description}. Return only the code.",
    implementation_verify: "Given the following component specification: {specification}, and the following code: {code}, does the code implement the specification correctly? Provide a yes/no answer and an explanation.",
};
// Abstract Command class
class Command {
    args;
    options = {};
    argDeclarations;
    constructor(args, argDeclarations) {
        this.args = args;
        this.argDeclarations = argDeclarations;
        this.parseOptions();
    }
    parseOptions() {
        const argMap = {};
        for (let i = 2; i < this.args.length; i += 2) {
            const key = this.args[i].replace("--", "");
            const value = this.args[i + 1];
            argMap[key] = value;
        }
        for (const decl of this.argDeclarations) {
            const value = argMap[decl.name];
            if (decl.required && value === undefined) {
                throw new Error(`Missing required option: --${decl.name}`);
            }
            if (value !== undefined) {
                switch (decl.type) {
                    case "string":
                        this.options[decl.name] = value;
                        break;
                    case "number":
                        this.options[decl.name] = Number(value);
                        break;
                    case "boolean":
                        this.options[decl.name] = value === "true";
                        break;
                    case "file":
                        this.options[decl.name] = fs.readFileSync(value, "utf8");
                        break;
                }
            }
        }
    }
    fillTemplate(template, params) {
        return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || "");
    }
    async callLLM(promptId, params) {
        const prompt = this.fillTemplate(PROMPT_IDS[promptId], params);
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0].message.content.trim();
    }
    getComponentName(specContent) {
        const spec = JSON.parse(specContent);
        const name = spec.name;
        if (!name) {
            throw new Error('Specification must contain a "name" field');
        }
        return name;
    }
    getExtension(platform) {
        const extension = PLATFORM_EXTENSIONS[platform];
        if (!extension) {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        return extension;
    }
}
// Specification Create Command
class SpecificationCreateCommand extends Command {
    constructor(args) {
        super(args, [
            { name: "name", type: "string", required: true },
            { name: "schema", type: "file", required: true },
            { name: "description", type: "string", required: true },
        ]);
    }
    async execute() {
        const name = this.options["name"];
        const schemaContent = this.options["schema"];
        const description = this.options["description"];
        const response = await this.callLLM("specification_create", {
            schema: schemaContent,
            name,
            description,
        });
        const jsonObject = JSON.parse(response);
        fs.writeFileSync(`${name}.json`, JSON.stringify(jsonObject, null, 2));
    }
}
// Implementation Create Command
class ImplementationCreateCommand extends Command {
    constructor(args) {
        super(args, [
            { name: "object", type: "file", required: true },
            { name: "platform", type: "string", required: true },
        ]);
    }
    async execute() {
        const specContent = this.options["object"];
        const platform = this.options["platform"];
        const componentName = this.getComponentName(specContent);
        const extension = this.getExtension(platform);
        const response = await this.callLLM("implementation_create", {
            specification: specContent,
            platform,
        });
        fs.writeFileSync(`${componentName}.${extension}`, response);
    }
}
// Implementation Improve Command
class ImplementationImproveCommand extends Command {
    constructor(args) {
        super(args, [
            { name: "object", type: "file", required: true },
            { name: "platform", type: "string", required: true },
            { name: "description", type: "string", required: true },
        ]);
    }
    async execute() {
        const specContent = this.options["object"];
        const platform = this.options["platform"];
        const description = this.options["description"];
        const componentName = this.getComponentName(specContent);
        const extension = this.getExtension(platform);
        const response = await this.callLLM("implementation_improve", {
            specification: specContent,
            platform,
            description,
        });
        fs.writeFileSync(`${componentName}.improved.${extension}`, response);
    }
}
// Implementation Verify Command
class ImplementationVerifyCommand extends Command {
    constructor(args) {
        super(args, [
            { name: "object", type: "file", required: true },
            { name: "component", type: "file", required: true },
        ]);
    }
    async execute() {
        const specContent = this.options["object"];
        const codeContent = this.options["component"];
        const response = await this.callLLM("implementation_verify", {
            specification: specContent,
            code: codeContent,
        });
        console.log(response);
    }
}
// Command mapping
const commandMap = {
    "specification create": SpecificationCreateCommand,
    "implementation create": ImplementationCreateCommand,
    "implementation improve": ImplementationImproveCommand,
    "implementation verify": ImplementationVerifyCommand,
};
// Main execution
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: bun mytool.ts <command> <subcommand> [options]");
        process.exit(1);
    }
    const commandName = `${args[0]} ${args[1]}`;
    const CommandClass = commandMap[commandName];
    if (!CommandClass) {
        console.error(`Invalid command: ${commandName}`);
        process.exit(1);
    }
    const command = new CommandClass(args);
    await command.execute();
}
main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
//# sourceMappingURL=main.js.map