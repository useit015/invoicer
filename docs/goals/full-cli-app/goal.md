# Full CLI App

## Objective

Turn the current invoicer into a fuller professional CLI app by prioritizing all major product dimensions together: feature-complete invoicing workflows, richer commands, cleaner architecture, stronger tests, better human/agent documentation, and release-ready install/package polish.

## Original Request

Need to make this into a full CLI app with richer commands, better docs, and architecture.

## Intake Summary

- Input shape: `vague`
- Audience: developers, business users comfortable with CLIs, and coding agents operating invoice workflows locally.
- Authority: `requested`
- Proof type: `demo`
- Completion proof: full pro-ready CLI evidence: the app supports richer business workflows beyond single-invoice CRUD, has cleaner internal architecture, has install/release/package polish, tests pass, docs explain workflows, and another agent can run representative flows without guessing.
- Likely misfire: adding a grab bag of commands without a coherent app architecture, stable data model, migration path, or documented workflows.
- Blind spots considered: fresh board selected; user clarified to prioritize all dimensions, not only feature-complete workflow.
- Existing plan facts: preserve existing CLI, themes, JSON contracts, tests, companion skill, and small-batch commit practice.

## Goal Kind

`open_ended`

## Current Tranche

Discover the current app architecture and command surface, choose the highest-value combined workflow/architecture/release-polish slice, implement it with tests and docs, then audit whether the app now feels like a fuller professional CLI product.

## Non-Negotiable Constraints

- Preserve unrelated user changes.
- Commit in small batches after verified coherent changes.
- Keep agent-friendly output contracts stable: `--json`, stable exit codes, deterministic fixtures, and explicit docs.
- Prioritize feature breadth, architecture, docs, agent handoff, and release/install polish together.

## Stop Rule

Stop only when a final audit proves the feature-complete CLI workflow tranche is complete.

## Canonical Board

Machine truth lives at:

`docs/goals/full-cli-app/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/full-cli-app/goal.md.
```
