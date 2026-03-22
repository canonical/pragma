/** YAML frontmatter extracted from a SKILL.md file per the agentskills.io spec. */
export interface SkillFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly license?: string;
  readonly compatibility?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
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
