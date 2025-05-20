import type { Bindings } from "@comunica/types";

export function defaultTransform(binding: Bindings): Result {
	return {
		uri: binding.get("s")?.value ?? "",
		label: binding.get("label")?.value ?? "",
		typeUri: binding.has("t") ? binding.get("t")!.value : null,
	};
}

export interface Detail {
	predicate: string;
	object: {
		termType: string;
		value: string;
		datatype?: string;
		language?: string;
	};
}

export function transformDetail(binding: Bindings): Detail {
	const p = binding.get("predicate")!;
	const o = binding.get("object")!;
	return {
		predicate: p.value,
		object: {
			termType: o.termType,
			value: o.value,
			datatype: o.datatype?.value,
			language: o.language || undefined,
		},
	};
}
