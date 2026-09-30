/**
 * Reconciles a pull request's managed type labels against its title.
 *
 * Loaded by the sibling `action.yml` through `actions/github-script`, which
 * is why this file is CommonJS and exports the github-script contract: a
 * single async function taking the `{ github, context, core }` toolkit that
 * action injects. Nothing imports it and it belongs to no workspace — it runs
 * only on the runner, so it stays dependency-free and plain ES2022.
 *
 * The labels it manages are the conventional-commit types plus `breaking`;
 * it adds the ones the title implies, removes the ones it no longer does, and
 * leaves every other label alone.
 *
 * @note Impure — reads a pull request and writes its labels through the
 * GitHub API.
 */

// The closed type vocabulary, which must stay in step with the `types:` input
// given to `amannn/action-semantic-pull-request` in `pr-lint.yml`: that job
// decides which titles are legal, this one labels them.
const TYPES = ["feat", "fix", "docs", "refactor", "chore", "test", "ci", "revert"];
const BREAKING = "breaking";
// Only consulted when a label is missing from the repository, so a
// freshly generated repo labels its first PR correctly.
const COLORS = Object.fromEntries(TYPES.map((type) => [type, "b3c5d7"]));
COLORS[BREAKING] = "b60205";

async function applyTypeLabel({ github, context, core }) {
  const { owner, repo } = context.repo;
  // Read the pull request as it stands NOW, not as the event payload
  // snapshotted it when the edit was queued. A run that starts after
  // a later edit would otherwise reconcile a title and a label set
  // that are already history, and converge on the wrong answer while
  // reporting success.
  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: context.payload.pull_request.number,
  });

  // A fork PR gets a read-only token, so labelling would fail the run.
  if (pr.head.repo.full_name !== `${owner}/${repo}`) {
    core.warning("PR is from a fork; skipping labelling (the token is read-only).");
    return;
  }

  const match = /^([a-z]+)(\([^)]*\))?(!)?:\s/.exec(pr.title);
  if (!match) {
    core.setFailed(`PR title is not a conventional commit: ${pr.title}`);
    return;
  }
  const [, type, , breaking] = match;
  if (!TYPES.includes(type)) {
    core.setFailed(`"${type}" is not one of the allowed types: ${TYPES.join(", ")}`);
    return;
  }

  const managed = new Set([...TYPES, BREAKING]);
  const desired = new Set([type, ...(breaking ? [BREAKING] : [])]);
  const current = new Set(pr.labels.map((label) => label.name).filter((name) => managed.has(name)));

  const add = [...desired].filter((name) => !current.has(name));
  const remove = [...current].filter((name) => !desired.has(name));

  for (const name of add) {
    try {
      await github.rest.issues.getLabel({ owner, repo, name });
    } catch (error) {
      if (error.status !== 404) throw error;
      await github.rest.issues.createLabel({ owner, repo, name, color: COLORS[name] });
      core.info(`Created missing label "${name}"`);
    }
  }
  if (add.length > 0) {
    await github.rest.issues.addLabels({ owner, repo, issue_number: pr.number, labels: add });
  }
  for (const name of remove) {
    // A label that is already gone is the outcome this loop wants,
    // not an error. Anyone may remove one between the read above and
    // the write here — a maintainer clicking it off, another
    // automation — and GitHub answers a removal of an absent label
    // with a 404, which would fail the whole job over a state that
    // is already correct. The add loop above also catches a 404,
    // but for a different condition: there it means the repository
    // has no such label defined yet, and the answer is to create it.
    try {
      await github.rest.issues.removeLabel({ owner, repo, issue_number: pr.number, name });
    } catch (error) {
      if (error.status !== 404) throw error;
      core.info(`Label "${name}" was already absent`);
    }
  }
  core.info(`${pr.title}\n  added:   ${add.join(", ") || "—"}\n  removed: ${remove.join(", ") || "—"}`);
}

module.exports = applyTypeLabel;
