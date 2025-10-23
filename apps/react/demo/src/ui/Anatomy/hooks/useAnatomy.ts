/* @canonical/generator-ds 0.9.0-experimental.12 */

import * as jsyaml from "js-yaml";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UseAnatomyProps {
	yamlContent: string;
}

const useAnatomy = ({ yamlContent }: UseAnatomyProps) => {
	const [parsedAnatomy, setParsedAnatomy] = useState<any>(null);
	const [parseError, setParseError] = useState<string | null>(null);

	// Memoized YAML parser
	const parseYaml = useCallback((yaml: string) => {
		try {
			const parsed = jsyaml.load(yaml);
			setParseError(null);
			setParsedAnatomy(parsed);
		} catch (error) {
			setParseError((error as Error).message);
			setParsedAnatomy(null);
		}
	}, []);

	useEffect(() => {
		if (yamlContent) {
			parseYaml(yamlContent);
		}
	}, [yamlContent, parseYaml]);

	return useMemo(
		() => ({
			parsedAnatomy,
			parseError,
		}),
		[parsedAnatomy, parseError],
	);
};

export default useAnatomy;
