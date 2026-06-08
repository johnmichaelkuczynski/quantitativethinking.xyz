---
name: Practice assignment generation & grading guarantees
description: Non-obvious correctness rules for the qr-course "Practice Assignments" feature (uniqueness + submit flush).
---

# Practice Assignments — correctness invariants

The qr-course practice feature promises two hard guarantees that are NOT safe to leave to
LLM prompting or naive client state. Both are enforced explicitly in code.

## 1. "Never reuse a question" is enforced server-side, not by the prompt
**Rule:** Generation builds an avoid-list (real graded prompts + every prior practice prompt
for that assignment), but the *guarantee* is enforced after generation with a normalized
(`lower`/collapse-whitespace) `seen` Set: any generated prompt that collides with the avoid
set or another prompt in the same batch is regenerated, and the last-resort fallback is
`randomizedFallback()` (random numbers → unique by construction).
**Why:** The model ignores avoid-lists often enough that prompting alone violated the
"never reuse" requirement; the old fallback was a single constant problem that repeated on
every LLM failure.
**How to apply:** If you touch generation in `routes/practiceAssignments.ts`, keep the
post-generation dedup pass and never reintroduce a constant fallback problem.

## 2. Submit must flush answers before grading
**Rule:** The runner autosaves answers on every keystroke AND grades from DB state at submit.
`handleSubmit` first `await Promise.all(saveAnswer.mutateAsync(...))` for all answered
problems, then `submit.mutateAsync` — so an in-flight save can't cause grading of stale data.
**Why:** Fast typist + immediate click could grade a partial/older answer (race between the
debounced-less autosave and the independent submit call).
**How to apply:** Keep the flush-then-submit ordering in `PracticeAssignmentRunner.tsx`.

## Tutor visibility
The live tutor panel must stay on screen during ALL practice surfaces at every breakpoint
(use `flex min-h-[…]`, NOT `hidden lg:flex`). It is hidden only during real graded attempts.
