# Execute From Roadmap

Execute implementation work from a roadmap, plan, or staged specification while preserving stage boundaries, commit hygiene, and explicit approval gates.

## Description

This skill turns a planning document into a disciplined execution loop:

1. **Interpret the plan contract** — understand the plan's stages, constraints, deliverables, and acceptance signals.
2. **Translate plan structure into executable slices** — break work into stage-sized implementation units.
3. **Preserve reviewability** — keep commits aligned to completed slices rather than mixing unrelated work.
4. **Enforce approval gates** — run the right validations at the right time, not only at the end.
5. **Report progress against the plan** — maintain a clear mapping from plan items to code changes.

This skill is intentionally **plan-agnostic**. It works with:

- roadmap documents
- milestone plans
- phased RFCs
- task matrices
- checklist-driven plans
- implementation notes with approval gates

The plan does not need a rigid format. It only needs enough structure to infer:

- what must be built
- in what order
- what counts as done
- where human approval is required

## When to Use

Use this skill when:

- a user asks to implement work from a roadmap or staged plan
- a multi-PR or multi-commit change must follow explicit phases
- approval gates matter as much as coding
- you need to pause after a stage and wait for a signal
- the work spans refactors, tests, validation, and documentation

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| **plan source** | Yes | Roadmap, RFC, checklist, or staged specification |
| **target repo(s)** | Yes | The codebases affected by the plan |
| **execution mode** | No | Read-only planning, staged execution, or full execution |
| **commit policy** | No | Whether commits are allowed immediately or deferred |
| **approval policy** | No | When to run checks and when to wait for user confirmation |

## Core Principles

### 1. The plan is the contract

Do not treat the plan as inspiration. Treat it as the working contract.

- If the plan defines stages, keep them.
- If the plan defines gates, test them.
- If the plan defines exclusions, respect them.
- If the plan is ambiguous, infer cautiously and stay close to the text.

### 2. Stage boundaries are real boundaries

Do not casually merge stage work together.

Each stage should ideally have:

- a clearly stated objective
- a bounded file set or concern set
- its own validation story
- a natural commit boundary

### 3. Approval gates are first-class deliverables

A stage is not complete just because code exists.

A stage is complete only when:

- the implementation exists
- the intended tests or checks pass
- any requested audit conditions are satisfied
- the result matches the plan's acceptance language

### 4. Commits should tell the plan story

Prefer commits that correspond to plan slices such as:

- parser migration
- runtime integration
- export/domain restructuring
- approval-gate coverage
- documentation or skill authoring

Avoid mixing unrelated cleanup into the same commit unless the plan explicitly treats it as part of the slice.

### 5. Keep a live mapping from plan to code

At every point, be able to answer:

- which plan item is active
- which files implement it
- which validations prove it
- what remains before the next checkpoint

## Execution Modes

### Mode A — Mentalize only

Use when the user says things like:

- "understand the work but do not start"
- "plan this PR but wait for my signal"

Output should include:

- inferred stage structure
- likely files and subsystems
- risks and dependencies
- expected approval gates

Do **not** edit files or commit.

### Mode B — Execute without commit

Use when the user authorizes implementation but defers commits.

In this mode:

- implement stage slices normally
- keep commit boundaries in mind
- validate incrementally
- postpone actual commit creation until the restriction is lifted

### Mode C — Execute and commit

Use when the user authorizes normal execution.

In this mode:

- implement by stage
- validate by gate
- commit completed slices cleanly
- report what each commit covers

## Discovery Flow

### Step 1: Read the plan as structure, not prose

Extract the following if present:

- stages / phases / PR labels
- dependencies between stages
- hard constraints
- explicit acceptance criteria
- approval gates
- deliverables per stage

Typical plan markers include:

- headings like `PR1`, `Phase 2`, `Stage A`
- numbered checklists
- "done when" bullets
- commands like `bun run check`, `npm test`, `cargo test`
- review instructions such as "wait for approval"

### Step 2: Normalize the plan into an execution table

Convert the plan into an internal structure like:

| Stage | Goal | Files/areas | Risks | Approval gates | Commit boundary |
|-------|------|-------------|-------|----------------|-----------------|
| 1 | parser migration | CSS scanners, parser helpers | parser shape mismatch | tests, lint, perf gate | yes |
| 2 | runtime integration | worker, buffer update | stale cache state | unit tests | yes |

If the plan does not name stages explicitly, infer them from concern clusters.

### Step 3: Identify the active slice

Before editing, determine:

- what stage is in scope now
- what is explicitly out of scope
- what files are needed to implement only that slice

This prevents accidental cross-stage work.

### Step 4: Gather code context deeply enough to act

Read the relevant files, tests, and adjacent modules before editing.

Focus on:

- current architecture
- export structure
- test patterns
- runtime coupling points
- existing validation commands

### Step 5: Implement the smallest complete slice

Make the minimal change set that fully satisfies the current stage.

Prefer:

- complete, coherent changes
- domain-aligned file organization
- compatibility shims only when needed
- tests that prove the stage outcome

Avoid:

- speculative follow-up work
- unrelated cleanup
- breaking public APIs unless required by the plan

### Step 6: Run stage-local approval gates early

Do not wait until the end of a long sequence.

Examples:

- after parser migration, run scanner and parser tests
- after runtime changes, run targeted worker/runtime tests
- after export restructuring, run lint/typecheck/import tests
- after final integration, run full package or repo validation

### Step 7: Reconcile against the plan before declaring done

Ask:

- Did the code actually satisfy the named stage objective?
- Were all requested gates run?
- Did new structural requirements emerge from standards documents?
- Is there any plan-driven cleanup still missing?

Only then mark the slice complete.

### Step 8: Commit on stable slice boundaries

When commits are allowed, create them after a slice is both implemented and validated.

Good commit boundaries usually follow one of these patterns:

- one commit per plan stage
- one commit for code, one for follow-up docs/skills
- one commit for a refactor plus its proving tests

Avoid committing a half-validated slice.

## Approval Gates Method

Approval gates can be explicit or implicit.

### Explicit gates

These are written directly in the plan, for example:

- run `bun run check`
- run `bun run test`
- verify no remaining session references
- ensure exports follow a code standard

These must be executed exactly.

### Implicit gates

These are required by the nature of the change even if not spelled out.

Examples:

- typecheck after changing exported APIs
- targeted tests after parser/runtime changes
- search audit after "remove all references" requests
- performance or regression checks after incremental parsing changes

When implicit gates are necessary, add them and explain why.

### Gate categories

Use a mix of these as appropriate:

| Gate type | Purpose |
|-----------|---------|
| **Targeted tests** | Prove the changed slice works |
| **Full test suite** | Catch regressions across the package/repo |
| **Typecheck / lint** | Prove structural correctness |
| **Search audit** | Verify removals, naming, or reference cleanup |
| **Performance guard** | Prove non-functional constraints |
| **Standards audit** | Verify folder/export/architecture compliance |

## Commit Strategy

### Recommended sequence

1. implement one stage
2. run the stage gates
3. fix failures
4. rerun until stable
5. create the commit
6. move to the next stage

### Commit message style

Commit messages should describe the completed slice, not the entire project.

Examples:

- `refactor(lsp): separate css parser domains`
- `feat(runtime): reuse incremental parse fragments`
- `docs(skill): add roadmap execution methodology`

### When to split commits

Split when changes differ in kind, such as:

- product code vs documentation
- runtime behavior vs organizational refactor
- migration work vs cleanup work

If a later user request adds a drive-by cleanup, decide whether it belongs to the same slice or deserves a separate commit.

## Adapting to Different Plan Shapes

### Shape 1 — PR-oriented roadmap

The plan already names `PR1`, `PR2`, `PR3`.

Approach:

- treat each PR as the top-level slice
- infer sub-stages within each PR if needed
- align commits underneath the current PR only

### Shape 2 — Checklist implementation plan

The plan is mostly bullets and checkboxes.

Approach:

- group related checklist items into execution slices
- keep each slice thematically coherent
- define your own validation bundle for each group

### Shape 3 — Narrative RFC

The plan is mostly prose with objectives and constraints.

Approach:

- extract goals, exclusions, and milestones
- turn them into a temporary stage table
- confirm the inferred order through the document's dependency logic

### Shape 4 — Mixed standards + roadmap

The implementation plan is later amended by a standards document or review feedback.

Approach:

- treat the original plan as the base contract
- treat the standards/review feedback as new acceptance constraints
- refactor the remaining work plan before continuing

## Reporting Pattern

When summarizing progress, report against the plan rather than giving an unstructured changelog.

Recommended format:

1. **completed stage items**
2. **validation performed**
3. **remaining items**
4. **whether a commit was created**
5. **what is waiting on user approval**

## Anti-Patterns

Avoid these mistakes:

- starting implementation before understanding the active stage
- claiming a stage is done without running its gates
- delaying all validation until the very end
- creating one large commit for many unrelated stages
- silently expanding scope because adjacent code is convenient to edit
- ignoring newly surfaced standards that materially affect acceptance
- losing track of which code change satisfies which plan item

## Minimal Execution Template

Use this template internally when operating from a plan:

1. **Parse the contract**
	- extract stages, constraints, gates
2. **Choose the active slice**
	- define what is in and out of scope
3. **Gather context**
	- read code, tests, standards, adjacent modules
4. **Implement**
	- make the smallest complete slice
5. **Validate**
	- run targeted then broader gates
6. **Reconcile**
	- compare result against plan language
7. **Commit**
	- only if allowed and only after stability
8. **Report**
	- map code and validation back to the plan

## Success Criteria

This skill has been applied well when:

- the implementation can be explained stage by stage
- commit history mirrors the execution plan
- approval gates were actually exercised
- user-requested pauses and restrictions were honored
- follow-up cleanup reflects standards and review feedback without losing plan discipline

The final measure is not just that the code works. It is that the work remained legible, reviewable, and contract-faithful from plan to commit.
