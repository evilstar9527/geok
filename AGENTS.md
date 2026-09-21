# Git workflow

- For every change, create a separate task branch before editing. Use the
  `codex/` prefix unless the user specifies another branch name.
- Do not make or commit task changes directly on `main`. If uncommitted task
  changes already exist on `main`, carry them to a new branch before continuing.
- Implement, review, and run appropriate checks on the task branch, then merge
  the completed change into `main`. Preserve unrelated user changes.
- Report branch, commit, merge, and push status accurately; local edits alone
  do not mean the change has been merged or published.

# llmdoc

This project uses llmdoc V3 as persistent engineering context.

## CLI boundary

- Treat `@tokenroll/llmdoc` as external tooling. Run the pinned CLI as
  `npx -y @tokenroll/llmdoc@3.6.0 <command>`; never add it to this project's
  `package.json` or lockfile, and never call the unrelated bare package
  `npx llmdoc`.
- If the CLI is unavailable, report the degraded path and continue only with
  narrowly scoped native inspection.
- Hooks, when available, must remain read-only and fail-open. They may signal
  startup context or update needs, but must not mutate knowledge or source.

## Retrieval gate

Before broad repository discovery, and again when entering a new subsystem,
choose the single llmdoc entry point matching the task:

- concept, contract, term, or "where is X?" -> `search <query>`
- context or blast radius for concrete files -> `context --files <path...>`
- cold start or unclear scope -> `tree`
- known topic or kind -> `index --topic <topic>` / `index --kind <kind>`
- already identified documents -> `show <path...>`

These are alternatives, not a fixed sequence. After llmdoc narrows the working
set, use source, tests, schemas, Git, and other native tools for exact facts.
`status` and `delta` assess freshness and impact; they are not retrieval steps.
Check `unmappedFiles` for every `context --files` request even when other inputs
produce impacted documents.

## Knowledge boundary

- Stable knowledge lives in tracked `llmdoc/`. Temporary investigations,
  caches, and reflection candidates live in ignored `.llmdoc-tmp/`.
- Never hand-edit `llmdoc/meta.json`. Use guarded CLI operations such as
  `new`, `adopt`, `mv`, `fingerprint`, and `commit`.
- Preserve decisions and rationale, ownership boundaries, invariants,
  cross-module contracts, non-obvious failure semantics, and risky workflows.
  Leave facts that are cheap to reconstruct in source, tests, schemas, CLI
  help, or generated configuration.
- A code delta creates a review obligation, not an automatic prose change.
  Knowledge that remains true should be finalized as verified unchanged.
- In llmdoc workflows, investigators gather evidence, reflectors capture
  privacy-safe temporary lessons, and the recorder is the only writer of
  tracked knowledge.

## Workflow boundary

- `llmdoc:init`, `llmdoc:update`, `llmdoc:prune`, and `llmdoc:upgrade` are
  judgment-bearing Agent workflows, not equivalent runtime CLI commands.
- A knowledge workflow authorizes documentation maintenance only, not source
  changes. Align with the user before non-trivial edits.
- If no valid V3 surface exists, use init. Once it exists, use update.
- Suggest update after durable architecture, contract, or workflow changes and
  wait for confirmation. Run prune only with confirmation. Never suggest
  upgrade; run it only when explicitly requested by name.
- After knowledge changes, validate and close out through the workflow's commit
  protocol. If validation cannot be repaired, revert only the current llmdoc
  write set.
- Report exactly one workflow result: `success`, `no_change`, `dry_run`,
  `incomplete`, or `failed`.

## Reflection gate

Treat an explicit correction, verified approach failure, major rework, or an
instruction violation as a reflection signal only when it exposes a reusable
lesson. Store a privacy-safe candidate under
`.llmdoc-tmp/reflections/pending/`, never the transcript. Promote it only after
user confirmation and source verification, merging the durable rule into its
existing owner document.
