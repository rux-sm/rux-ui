# AI Agent Operating Guide — Rux UI & TripBoard

This is a human-facing guide for choosing an agent, model tier, mode, and verification posture. It is not required reading for every agent task; repository behavior is routed through `AGENTS.md`, `CLAUDE.md`, and `.cline/rules/project.md`.

For day-to-day decisions, use the shorter [AI Coding Quick Reference](AI_CODING_CHEAT_SHEET.md).

## 1. Core Operating Philosophy

> Classify first. Configure second. Escalate only for a reason.

> Use the least expensive configuration that reliably produces the correct result.

Before opening a coding session, assign the task a class from 1–5 and add `V` or `R` when applicable. Pick the corresponding model tier, reasoning level, and mode. Escalate only when new evidence shows the starting configuration is insufficient.

Intelligence and autonomy are separate choices. A difficult task may need a stronger model without permission to make broad or irreversible changes.

## 2. Universal Task Taxonomy

### 1 Fast Edit

Use for a typo, one CSS value, a small markup correction, a single event-listener fix, or another localized change with an obvious contract.

- Context: target file and the immediately relevant convention.
- Reasoning: low.
- Mode: edit/act.
- Verification: focused syntax, contract, or visual check.

### 2 Routine Feature

Use for a standard component, a contained interaction, a straightforward data query, or a feature following an established pattern.

- Context: target module, its direct dependency, and the closest existing example.
- Reasoning: medium.
- Mode: edit/act with a short implementation outline when useful.
- Verification: focused tests plus the affected user path.

### 3 Hard Debug / Review

Use for intermittent state, async ordering, long caller/callee chains, cross-file regressions, security-sensitive review, or a large diff that needs scrutiny.

- Context: failure evidence first, then expand only along the execution path.
- Reasoning: high.
- Mode: manual approval or checkpoints when the blast radius is uncertain.
- Verification: reproduce before editing, add or identify regression coverage, and verify the original failure path.

### 4 Architecture / Planning

Use for schema design, migration design, module boundaries, feature decomposition, or evaluating alternatives.

- Context: contracts and constraints, not every implementation file.
- Reasoning: medium–high or high.
- Mode: plan/read-only.
- Output: decision, tradeoffs, affected surfaces, rollout, rollback, and verification plan.
- Do not combine planning and implementation in the same instruction unless that transition is explicit.

### 5 Large / Autonomous Work

Use for a broad migration, major refactor, multi-part feature, or long-running effort with independently verifiable workstreams.

- Context: an agreed plan plus workstream-specific files.
- Reasoning: high–max.
- Mode: autonomous only with clear boundaries, checkpoints, and stop conditions.
- Verification: staged checks after each workstream and a final integration pass.
- Parallel agents help only when workstreams are genuinely independent.

## 3. Visual `V` Modifier

Append `V` when success depends on appearance or interaction: `1V`, `2V`, or `3V`.

`V` changes the tools and evidence, not automatically the reasoning level:

- Provide the reference screenshot, viewport, theme, and target state.
- Use a vision-capable model when matching an image or inspecting rendered output.
- Serve the app and inspect the affected UI at narrow and wide widths.
- Check light and dark themes for shared Rux UI changes.
- Compare rendered results, not only CSS declarations.
- Treat accessibility, focus, hover, active, loading, empty, and error states as part of visual completion when affected.

## 4. Risk `R` Modifier

Append `R` when the task touches production data, destructive SQL, bulk deletion, authentication, secrets, permissions, breaking public APIs, or irreversible migrations: `2R`, `3R`, or `4R`.

`R` changes autonomy and review requirements:

- Inspect current state before proposing changes.
- Separate proposal from execution.
- Identify blast radius, backward compatibility, rollout, and rollback.
- Prefer additive and reversible changes.
- Require explicit authorization before destructive or production execution.
- Use manual approval/checkpoint mode even when a high-capability model is selected.

## 5. Master Cline / Codex / Claude Code Decision Matrix

Model availability and names can change. Treat the names below as tier examples and select the current equivalent offered in the tool.

| Class | Typical work | Cline | Codex | Claude Code | Mode |
|---|---|---|---|---|---|
| `1` | Fast edit | ClinePass Flash, low | Luna, low | Sonnet, low | Act/edit |
| `2` | Routine feature | ClinePass Flash or Pro, medium | Terra, medium | Sonnet, medium | Act/edit |
| `3` | Hard debug/review | ClinePass Pro, high | Sol, high | Fable, high | Manual/checkpoints |
| `4` | Architecture/planning | ClinePass Pro, high | Sol, high | Fable, high | Plan/read-only |
| `5` | Large/autonomous | ClinePass Pro, max | Sol, max; multi-agent only when decomposable | Fable, high–max | Act with staged checkpoints |

Apply modifiers after choosing the row:

- `V`: add visual inputs and rendered verification; choose vision support if needed.
- `R`: reduce autonomy, require explicit approvals, and add rollback analysis.
- `VR`: apply both. A `2VR` task can still use a medium reasoning model while requiring visual evidence and manual approval for risky actions.

## 6. Golden Rules of AI Usage Efficiency

1. Start with the lowest tier that fits the classified task.
2. Load the narrowest useful context. More files do not automatically produce a better answer.
3. Point to an existing pattern instead of asking the agent to rediscover conventions.
4. Separate planning from implementation and review from mutation.
5. Escalate after a concrete failure or newly discovered complexity, not from anxiety.
6. Do not repeat the same failed prompt at the same configuration more than once.
7. Keep diffs small enough to review and verification proportional to risk.
8. State acceptance criteria and stop conditions before autonomous work.
9. Reuse repository instructions instead of pasting the design system into every prompt.
10. Report uncertainty rather than spending context pretending an unverified result is complete.

## 7. Escalation Rules

Escalate one level when at least one of these is true:

- A focused attempt failed and the failure evidence is available.
- The execution path crosses more modules or state boundaries than expected.
- Competing contracts or ambiguous requirements require deeper judgment.
- The change becomes security-, permission-, data-, or migration-sensitive.
- Visual comparison shows a persistent mismatch that code inspection cannot explain.
- Review uncovers a larger blast radius than the original task classification.

When escalating, carry forward the failure evidence, relevant files, attempted fix, and remaining uncertainty. Do not restart with a broad repository scan.

De-escalate once the hard question is resolved. A high-tier debugging pass can hand a precise one-file edit back to a faster configuration.

## 8. Platform-Specific Recommendations

### Cline

- Keep `.cline/rules/project.md` always active and concise.
- Use Plan mode for class 4 and for the proposal phase of `R` work.
- Use Act mode for bounded implementation after scope and approvals are clear.
- Prefer ClinePass Flash for classes 1–2 and Pro for classes 3–5 or failed lower-tier attempts.

### Codex

- `AGENTS.md` supplies the always-on repository policy.
- Use Luna for small, obvious edits, Terra for routine implementation, and Sol for hard debugging, architecture, or large work when those tiers are available.
- Use Plan mode for class 4; planning remains read-only.
- Use multi-agent work only for class 5 tasks with independent, clearly owned workstreams.

### Claude Code

- `CLAUDE.md` supplies the always-on repository policy.
- Use Sonnet for classes 1–2 and Fable for classes 3–5 when those tiers are available.
- Use Plan mode for architecture and migration design.
- Use manual approval/checkpoints for hard debugging and `R` work; reserve autonomous mode for bounded class 5 work.
- Use the on-demand `verify` skill for repository-specific launch and verification guidance when relevant.

## 9. Repository Instruction Architecture

| File | Audience | Responsibility | Loading posture |
|---|---|---|---|
| `README.md` | Humans and agents | Project, design-system, content, and usage orientation | Read at task start |
| `SKILL.md` | UI-capable agents | Detailed Rux UI implementation, tokens, components, layout, content, and visual verification | Read only for UI/frontend work |
| `AGENTS.md` | Codex | Concise repository behavior and routing | Always on |
| `CLAUDE.md` | Claude Code | Concise repository behavior and routing | Always on |
| `.cline/rules/project.md` | Cline | Concise repository behavior and routing | Always on |
| `.claude/skills/verify/SKILL.md` | Claude Code | On-demand local launch and verification procedure | Load only when verification needs it |
| `docs/ai/AI_CODING_CHEAT_SHEET.md` | Human developer | Personal day-to-day classification and configuration card | Read when starting or escalating a task |
| `docs/ai/AI_AGENT_WORKFLOW.md` | Human developer | Task classification, model/mode selection, escalation, and prompt templates | Read when choosing or adjusting a workflow |

Detailed UI rules belong in `SKILL.md`; model-selection strategy belongs here. The always-on files should route to those sources instead of duplicating them.

## 10. Rux UI Guardrails

- For UI, CSS, design tokens, component, content, or responsive work, read `SKILL.md` before editing.
- Reuse existing `.rux-*` components and `--rux-*` tokens before creating new primitives.
- Inspect `css/tokens.css` when token or styling contracts are involved.
- Put reusable component styling under `css/base/`, product-specific styling under `css/features/`, and layout behavior under `css/layout/`, following existing imports.
- Do not add inline styles, hardcoded colors, emoji icons, or incompatible class conventions when the established system applies.
- Preserve light/dark support, responsiveness, semantic markup, keyboard behavior, focus visibility, and reduced-motion behavior.
- Public tokens and `.rux-*` classes are compatibility surfaces; removal or renaming requires an explicit migration plan.

`SKILL.md` remains authoritative for detailed UI rules. This section is only the operating summary.

## 11. JavaScript/Application Guardrails

- This repository uses static HTML, CSS, and vanilla JavaScript modules; do not introduce a framework or build dependency for a local task.
- Start with the relevant module under `js/` or the affected section of `index.html`; avoid reading the entire large application file without a task-specific reason.
- Preserve established DOM attributes, events, module exports, and public behavior unless the request explicitly changes the contract.
- Trace state changes through the direct caller/callee chain before editing a bug.
- Keep data access in the existing `js/data/` layer and UI behavior in the established component, core, page, or panel area.
- Prefer a regression test under `tests/` when a stable contract can be expressed.
- Run a focused Node test first, then `npm test` when the change has broader impact.

## 12. Supabase/Database Guardrails

- There is no consolidated schema file. Inspect the relevant SQL history under `supabase/` and the affected module under `js/data/`.
- Treat the configured Supabase project as live; repository testing must not create, mutate, or delete production data without explicit authorization.
- Prefer additive, backward-compatible SQL patches and follow the conventions of nearby patches.
- Review table, column, constraint, trigger, function, storage, RLS, and client compatibility implications as applicable.
- For destructive or irreversible changes, provide preconditions, a dry-run/read query where possible, rollout order, backup/rollback implications, and post-change verification.
- Never expose or rotate secrets as an incidental part of another task.
- Do not claim a database migration was verified when it was only reviewed statically.

## 13. Reusable Prompt Templates

### Fast edit (`1`)

```text
Task class: 1.
Change only [target file/area] to [specific outcome].
Follow the closest existing pattern. Do not refactor unrelated code.
Run [focused check] and report the diff plus anything unverified.
```

### Routine UI feature (`2V`)

```text
Task class: 2V.
Read SKILL.md, then inspect [target markup/style] and the closest existing component.
Implement [acceptance criteria] using existing --rux-* tokens and .rux-* components.
Verify narrow/wide layouts, light/dark themes, and affected interaction states.
```

### Hard bug (`3`)

```text
Task class: 3.
Reproduce or trace [failure] before editing. Start at [suspected module] and expand only through the caller/callee chain.
Explain the root cause, make the smallest coherent fix, add or identify regression coverage, and verify the original failure path.
```

### Architecture or migration plan (`4R`)

```text
Task class: 4R. Plan only; do not modify files or execute changes.
Inspect [current contracts/schema area]. Propose options, recommend one, and identify blast radius, compatibility, rollout, rollback, and verification.
Flag every step that requires explicit production authorization.
```

### Large autonomous task (`5`)

```text
Task class: 5.
Use this approved plan: [plan].
Work only within [boundaries]. Split into independently verifiable stages, stop at [approval points], and run [checks] after each stage.
Do not broaden scope; report blockers and residual risks before continuing past a checkpoint.
```

## 14. Definition of Done

A task is done only when:

- The requested outcome and acceptance criteria are satisfied.
- The smallest coherent scope was maintained.
- Existing Rux UI, JavaScript, and data-layer conventions remain intact.
- Compatibility surfaces were preserved or an explicitly requested migration was documented.
- Relevant focused verification passed; broader tests were run when warranted.
- Visual work was rendered and inspected when tooling allowed.
- The final diff contains no unrelated changes or whitespace errors.
- Unverified assumptions, blocked checks, rollout needs, and residual risks are stated plainly.

## 15. Danger-Zone Rules for Destructive/High-Risk Work

Danger-zone work includes production database mutations, destructive SQL, bulk deletion, authentication, secrets, permission configuration, breaking public API changes, and irreversible migrations.

Before execution:

1. Resolve the exact target and current state with read-only inspection.
2. Write the proposed command or migration for review.
3. Explain affected users/data, dependencies, and backward compatibility.
4. Define backup, rollback, or recovery steps and identify anything irreversible.
5. Define a safe verification query or observable success condition.
6. Obtain explicit authorization for the exact production/destructive action.

During execution, use the narrowest target, retain checkpoints, and stop on unexpected output. Afterward, verify the result and report what changed and how recovery would work.

Do not confuse high intelligence with high autonomy. A stronger model does not remove approval requirements.
