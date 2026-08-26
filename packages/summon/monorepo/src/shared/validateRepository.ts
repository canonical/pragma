/**
 * A full GitHub repository URL: org and repo segments, optional trailing
 * slash or `.git` suffix.
 */
const GITHUB_REPO =
  /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/;

/**
 * Validate the repository URL. The field is optional — only an absent or
 * empty value is the optional escape; any other value (including a truthy
 * non-string) must be a full GitHub repository URL, since it flows verbatim
 * into the scaffolded package.json repository/bugs/homepage fields.
 */
export default function validateRepository(value: unknown): true | string {
  if (value === undefined || value === null || value === "") {
    return true; // Optional field
  }

  if (typeof value !== "string" || !GITHUB_REPO.test(value.trim())) {
    return "Repository must be a GitHub repository URL like https://github.com/org/repo";
  }

  return true;
}
