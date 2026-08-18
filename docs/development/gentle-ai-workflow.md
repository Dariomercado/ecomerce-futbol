# Gentle AI Compatibility Workflow

This repository operates under an **ordinary-policy compatibility mode** while
Gentle AI native SDD authority cannot truthfully complete the historical
`post-payment-operations` lifecycle. It keeps delivery accountable without
inventing a receipt, approval, or archive result.

## Decision

| Area | Decision |
| --- | --- |
| RDD | Disabled at clone scope. Do not re-enable it or simulate receipts. |
| Planning | Use lightweight SDD/OpenSpec artifacts: proposal, spec, design, and tasks. |
| Implementation | Delegate non-trivial implementation work; keep the artifact trail current. |
| Verification | Run Vitest, lint, typecheck, build, and applicable E2E checks under ordinary repository policy. |
| Native SDD status | The current attempt-ledger/authority block is historical infrastructure state, not an application failure. |
| `/plan` | Optional; it is not a prerequisite for planning, implementation, verification, or delivery. |

## Quick path

1. Record the intended slice with lightweight OpenSpec planning artifacts.
2. Implement through a delegated worker and preserve task/progress evidence.
3. Run the relevant ordinary checks: Vitest, lint, typecheck, build, and E2E when applicable.
4. Report check outputs honestly; do not manufacture an RDD receipt or native approval.
5. Record a native block once, then continue only through the ordinary-policy path.

## Rules

- Keep RDD disabled unless the repository owner explicitly changes that decision.
- Do not bypass, patch, or emulate native receipts, review authority, attempt-ledger
  tokens, verification results, or archive permission.
- Do not change historical OpenSpec artifacts merely to make a blocked native
  lifecycle look complete.
- A native SDD block is an infrastructure/state signal. Capture its command,
  bounded outcome, and preserved application state; do not retry in a loop.
- Use ordinary checks as evidence of application quality, not as a substitute
  for a native receipt.
- Treat failed ordinary checks as application work: fix, rerun the affected
  checks, and record the result.

## When to re-evaluate native verify/archive

Retry native `verify` or `archive` only after **one** of these is true:

- Gentle AI publishes a fix that addresses the affected authority or attempt-ledger path and it is installed; or
- an authorized maintainer explicitly repairs the relevant native authority state.

Before retrying, confirm the application candidate and its ordinary-check
results are still known. Run a bounded retry, record its result, and stop again
if the same native block remains.

## Commits and reviews

- SDD does not create commits automatically.
- Each work unit must result in a reviewable conventional commit containing its code, tests, and documentation.
- Run the applicable ordinary verification before committing.
- RDD receipts and review gates are disabled and are not commit prerequisites.
- GitHub pull-request review and CI provide the collaborative review path.
- Never use `git add .` before classifying the intended files.
## Compatibility, not approval

This mode is a transparent operational compatibility workflow. It preserves
planning, delegated implementation, and ordinary verification while native
infrastructure is unavailable. It does **not** create a false approval, replace
an RDD receipt, or claim that a blocked SDD archive completed.

