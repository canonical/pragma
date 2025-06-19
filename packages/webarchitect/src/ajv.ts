import Ajv from "ajv";
import draft202012 from "./schemas/draft-2020-12.json" with { type: "json" };
import metaApplicator from "./schemas/meta/applicator.json" with {
	type: "json",
};
import metaContent from "./schemas/meta/content.json" with { type: "json" };
import metaCore from "./schemas/meta/core.json" with { type: "json" };
import metaFormatAnnotation from "./schemas/meta/format-annotation.json" with {
	type: "json",
};
import metaMetaData from "./schemas/meta/meta-data.json" with { type: "json" };
import metaUnevaluated from "./schemas/meta/unevaluated.json" with {
	type: "json",
};
import metaValidation from "./schemas/meta/validation.json" with {
	type: "json",
};

const ajv = new Ajv.default({
	strict: false,
	allErrors: true,
});
// Register Draft 2020-12 main schema
ajv.addSchema(draft202012, "https://json-schema.org/draft/2020-12/schema");

// Register meta schemas
ajv.addMetaSchema(metaCore, "https://json-schema.org/draft/2020-12/meta/core");
ajv.addMetaSchema(
	metaApplicator,
	"https://json-schema.org/draft/2020-12/meta/applicator",
);
ajv.addMetaSchema(
	metaContent,
	"https://json-schema.org/draft/2020-12/meta/content",
);
ajv.addMetaSchema(
	metaFormatAnnotation,
	"https://json-schema.org/draft/2020-12/meta/format-annotation",
);
ajv.addMetaSchema(
	metaMetaData,
	"https://json-schema.org/draft/2020-12/meta/meta-data",
);
ajv.addMetaSchema(
	metaUnevaluated,
	"https://json-schema.org/draft/2020-12/meta/unevaluated",
);
ajv.addMetaSchema(
	metaValidation,
	"https://json-schema.org/draft/2020-12/meta/validation",
);

export default ajv;
