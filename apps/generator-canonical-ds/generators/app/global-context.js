import * as fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8"));
const GENERATOR_CONTEXT = {
    generatorPackageName: pkgJson.name,
    generatorPackageVersion: pkgJson.version,
    generatorPackageGitRepo: pkgJson.repository.url,
    /**
     * The name of the generator without the `generator-` yeoman prefix.
     * This is the identifier name used to call this generator from the command line.
     */
    generatorScriptIdentifer: pkgJson.name.replace("generator-", ""),
    cssNamespace: "ds",
};
export default GENERATOR_CONTEXT;
