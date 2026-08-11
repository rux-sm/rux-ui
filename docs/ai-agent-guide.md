# AI Agent Workflow Guide

> Pick the right model and effort level for the job — so you're fast when you can be, and deliberate only when you have to be.

## The One Rule

> **Start cheap & fast. Escalate only when blocked.**
>
> - Default to a **fast model + low effort**.
> - Jump to a **big model + high effort** only when the task is *genuinely hard* (cross-file bug, schema migration, framework upgrade) or a cheap pass already failed.
> - **Never** start a task at high reasoning "just to be safe."
> - **Plans stay read-only** — don't let a planning task also edit files.

Most wasted tokens come from defaulting to high reasoning — not from model choice. Restraint on settings beats model choice almost every time.

---

## The Shared Taxonomy (all 3 tools, same 5 tasks)

| # | Task type | Looks like |
|---|-----------|------------|
| 1 | **Fast edits** | CSS one-liner, HTML formatting, typo fix, single broken listener |
| 2 | **Routine features** | Standard UI component, straightforward CRUD / Supabase query |
| 3 | **Hard debugging / reviews** | Tricky async bug, long call chain across files, scrutinizing a big change |
| 4 | **Architecture / planning** | Designing a schema, planning module interactions, scoping a feature, designing a migration |
| 5 | **Large refactor / multi-file** | Rewriting an engine, migrating a whole design system, multi-workstream upgrade |

---

## Cline

### Model tiers

*Provider: cline-pass.*

| Tier | Recommended model | Uses |
|------|-------------------|------|
| **Fast** | DeepSeek V4 Flash | Fast edits, quick fixes, short edit-test loops |
| **Coding** | Claude Opus 5 | Routine feature logic, JS/SQL implementation |
| **Frontend** | Claude Opus 5 *(only if matching a visual mockup/screenshot)* | HTML/CSS from a design |
| **Premium** | Claude Opus 5 | Hard debugging, large refactors |
| **Planning** | DeepSeek V4 Flash | Architecture / schema design (read-only) |

### By task

| Task | Tier | Reasoning | Mode |
|------|------|-----------|------|
| 1. Fast edits | Fast | Low | Act |
| 2. Routine features | Coding | Medium | Act |
| 3. Hard debugging / reviews | Premium | High | Act (review diffs) |
| 4. Architecture / planning | Planning | Medium–High | **Plan (read-only)** |
| 5. Large refactor | Premium | Max | Act |

**Cline tips**
- Use **Plan mode** for anything structural — it explores and proposes before touching files.
- Don't make the premium model your default.
- Frontend-only? A vision model helps only when matching a screenshot. Otherwise use a fast coding model.
- Escalation: if a task fails once on the fast tier, jump up — don't retry three times.

---

## Codex

*Model: GPT-5.6-Sol (subscription). Reasoning: low · medium · high · xhigh · max · ultra.*

### By task

| Task | Model | Reasoning | Mode |
|------|-------|-----------|------|
| 1. Fast edits | GPT-5.6-Sol | **low** | Auto |
| 2. Routine features | GPT-5.6-Sol | **medium** | Auto |
| 3. Hard debugging / reviews | GPT-5.6-Sol | **high** | Auto |
| 4. Architecture / planning | GPT-5.6-Sol | **high** | **Plan / read-only** |
| 5. Large-scale / multi-agent | GPT-5.6-Sol | **max / ultra** | Auto (multi-agent) |

**Codex tips**
- **Light reasoning is your default** — fastest and cheapest for clear, narrow work (most of your day).
- **Medium = your normal** for routine feature work.
- **High is for hard problems only** — long call chains, async state bugs. Not for routine edits.
- **Plan mode for architecture**: high reasoning + read-only keeps schema/migration design safe.
- **Ultra / multi-agent is rare** — parallel workstreams only (backend API + DB migration + frontend deps at once).

---

## Claude Code

*Model: Claude Fable 5 (subscription). Default effort: medium.*

### By task

| Task | Effort | Mode |
|------|--------|------|
| 1. Fast edits | **Low** | Edit-Automatically |
| 2. Routine features | **Medium** | Edit-Automatically |
| 3. Hard debugging / reviews | **High** | **Manual** |
| 4. Architecture / planning | **High** | **Plan** |
| 5. Large-scale autonomous | **High–Max** | Auto |

**Claude Code tips**
- **Low effort is the most cost-effective** — responds fast on pattern recognition, no extended thinking.
- **Medium effort is your everyday default** — enough budget to inspect files and validate.
- **Manual mode + High effort for hard debugging** — you approve every shell command it attempts.
- **Plan mode + High effort for architecture** — explore and present a strategy before changing anything.
- **Auto mode + High/Max is intentional & rare** — long uninterrupted runs (big refactors, test suites, docs).

---

## Quick Reference Card

| Task type | Fast/cheap? | Reasoning budget | Mode |
|-----------|-------------|------------------|------|
| 1. Fast edits | ✅ | Low | Auto / Edit |
| 2. Routine features | ✅ | Medium | Auto / Edit |
| 3. Hard debugging | ➖ | High | **Manual** |
| 4. Architecture / planning | ✅ (save tokens) | Medium–High | **Plan / read-only** |
| 5. Large refactor | ❌ | Max | Auto / Multi-agent |

## Guardrails

1. Never start at high/max reasoning "to be safe." Start low/medium.
2. Plans are read-only — never let planning also edit files.
3. Escalate deliberately: low → medium → high → max, not from habit.

---

_Model names are starting recommendations. Swap in the current tier for whatever vendor you use — the logic (cheap-first, escalate-when-blocked, read-only plans) stays the same._
