/** YAML frontmatter extracted from a SKILL.md file per the agentskills.io spec. */
export interface SkillFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly license?: string;
  readonly compatibility?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** `false` opts this skill out of the auto-projected MCP stub prompt. */
  readonly prompt?: boolean;
}

/** A skill discovered from a hardcoded source path. */
export interface DiscoveredSkill {
  readonly name: string;
  readonly description: string;
  readonly sourcePath: string;
  readonly sourcePackage: string;
  readonly folderName: string;
  readonly frontmatter: SkillFrontmatter;
}

/** Availability metadata about a skill source entry. */
export interface SkillSource {
  readonly path: string;
  readonly packageName: string;
  readonly available: boolean;
}

/** A discovered skill enriched with its full SKILL.md content and companion files. */
export interface SkillDetailed extends DiscoveredSkill {
  /** Full SKILL.md text, frontmatter included. */
  readonly content: string;
  /** Companion file names shipped next to SKILL.md (e.g. spec documents). */
  readonly files: readonly string[];
}
