/**
 * Common template helpers that can be passed to templates.
 */

import {
  capitalize,
  indent,
  join,
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
} from "@canonical/utils";

const templateHelpers = {
  camelCase: toCamelCase,
  pascalCase: toPascalCase,
  kebabCase: toKebabCase,
  snakeCase: toSnakeCase,
  constantCase: toConstantCase,
  capitalize,
  indent,
  join,

  isoDate: (): string => new Date().toISOString(),

  year: (): number => new Date().getFullYear(),

  pluralize: (word: string, count: number): string => {
    return count === 1 ? word : `${word}s`;
  },
};

export default templateHelpers;
