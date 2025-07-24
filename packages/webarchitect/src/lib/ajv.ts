import ajvPackage from "ajv";
import draft202012 from "../schemas/draft-2020-12.json" with { type: "json" };
import metaApplicator from "../schemas/meta/applicator.json" with {
  type: "json",
};
import metaContent from "../schemas/meta/content.json" with { type: "json" };
import metaCore from "../schemas/meta/core.json" with { type: "json" };
import metaFormatAnnotation from "../schemas/meta/format-annotation.json" with {
  type: "json",
};
import metaMetaData from "../schemas/meta/meta-data.json" with { type: "json" };
import metaUnevaluated from "../schemas/meta/unevaluated.json" with {
  type: "json",
};
import metaValidation from "../schemas/meta/validation.json" with {
  type: "json",
};

const Ajv = ajvPackage.default;

// Create AJV instance with configuration optimized for our use case
const ajv = new Ajv({
  strict: false, // Allow unknown keywords without throwing errors
  allErrors: true, // Collect all validation errors, not just the first one
  validateSchema: false, // Temporarily disable automatic schema validation during setup
});

// Step 1: Register all the foundational meta-schemas first
// These are the building blocks that the main Draft 2020-12 schema depends on
ajv.addSchema(metaCore, "https://json-schema.org/draft/2020-12/meta/core");
ajv.addSchema(
  metaApplicator,
  "https://json-schema.org/draft/2020-12/meta/applicator",
);
ajv.addSchema(
  metaUnevaluated,
  "https://json-schema.org/draft/2020-12/meta/unevaluated",
);
ajv.addSchema(
  metaValidation,
  "https://json-schema.org/draft/2020-12/meta/validation",
);
ajv.addSchema(
  metaMetaData,
  "https://json-schema.org/draft/2020-12/meta/meta-data",
);
ajv.addSchema(
  metaFormatAnnotation,
  "https://json-schema.org/draft/2020-12/meta/format-annotation",
);
ajv.addSchema(
  metaContent,
  "https://json-schema.org/draft/2020-12/meta/content",
);

// Step 2: Now register the main Draft 2020-12 schema
// This schema composes all the meta-schemas above into the complete specification
ajv.addSchema(draft202012, "https://json-schema.org/draft/2020-12/schema");
ajv.addSchema(draft202012, "http://json-schema.org/draft/2020-12/schema");

// Step 3: Re-enable schema validation now that all pieces are in place
ajv.opts.validateSchema = true;

// Step 4: Add format validation support manually to avoid type issues
// Instead of using ajv-formats, we'll add the most common formats we need
ajv.addFormat("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
ajv.addFormat("uri", /^https?:\/\/[^\s]+$/);
ajv.addFormat("uri-reference", /^[^\s]*$/);
// Add regex format validation - validates that a string is a valid regular expression
ajv.addFormat("regex", {
  type: "string",
  validate: (data: string) => {
    try {
      new RegExp(data);
      return true;
    } catch {
      return false;
    }
  },
});

export default ajv;
