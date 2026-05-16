# Invoicely CLI Agent-Friendly Version

## Objective

Prepare and execute a bounded GoalBuddy run to map `legions-developer/invoicely`, identify the highest-value invoice workflows to port, and then make a CLI-first version with agent-friendly operating surfaces such as predictable commands, machine-readable outputs, and possibly a companion Codex skill.

## Original Request

Need to make a CLI version of `legions-developer/invoicely` while making it agent friendly, maybe CLI plus skill.

## Intake Summary

- Input shape: `vague`
- Audience: developers and coding agents that need to create, manage, inspect, or automate invoices from a local CLI.
- Authority: `requested`
- Proof type: `demo`
- Completion proof: another agent can use the produced CLI docs/spec or companion skill handoff to inspect the intended Invoicely workflow scope, run or verify representative commands, and automate the next implementation slice without guessing.
- Likely misfire: building a thin command wrapper that resembles the reference repo but is not useful for agent workflows, lacks stable output contracts, or ignores repository constraints.
- Blind spots considered: visual board selection; first tranche target selected as feature parity discovery; success proof selected as agent handoff proof; scope selected as full product path when Scout/Judge evidence supports it; exact CLI surface; expected persistence model; whether the companion skill is required in this tranche.
- Existing plan facts: use local live GoalBuddy board; first optimize for feature parity discovery; prove usefulness through agent handoff; allow web/backend/product changes if needed for parity; preserve instruction to commit in small batches.

## Goal Kind

`open_ended`

## Current Tranche

Complete diagnostic intake, then create a board that first maps the reference project and local repo before choosing and implementing the largest safe verified CLI and agent-facing slice.

## Non-Negotiable Constraints

- Keep this prep turn limited to GoalBuddy control files and board setup.
- During execution, inspect the local repository and reference project before choosing implementation work.
- Full product path is in scope during execution: CLI, backend, persistence, docs/skill, and web surfaces may be changed when Scout/Judge evidence says they are needed.
- Preserve the workspace instruction: always commit in small batches.
- Prefer agent-friendly interfaces: deterministic commands, structured output, clear error behavior, idempotent operations where appropriate, and documented handoff surfaces.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete.

Do not stop after planning, discovery, or Judge selection if a safe Worker task can be activated.

## Canonical Board

Machine truth lives at:

`docs/goals/invoicely-cli-agent-friendly/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/invoicely-cli-agent-friendly/goal.md.
```
