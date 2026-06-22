---
name: Assessment never-repeat avoid-list
description: How qr-course Diagnostic Assessments guarantee never-repeated questions across infinite retakes, and the cap pitfall.
---

# Assessment never-repeat guarantee

The qr-course "Diagnostic Assessments" feature (code/UI name: **Assessments**, distinct from the operator **Diagnostics** self-test page) requires *infinitely retakeable* assessments where a student never sees the same question twice for a given slug+format (custom assessments share one "custom" pool).

## The rule
The avoid-list query that loads prior prompts for dedupe must fetch the **full history** for that slug+format — never a capped window. The dedupe `Set` (normalized prompts) must cover everything ever generated, or retakes silently start repeating once history exceeds the cap.

**Why:** An early version capped the query at `.limit(200)` and only sent the last 120 to the model. That breaks the "never repeated" requirement after enough retakes — the architect review caught it as a blocking failure. The DB-side dedupe Set is the durable guarantee; the bounded slice sent to the LLM is *only* context guidance, not the dedupe mechanism. Keep those two concerns separate: bound what goes to the model (token cost), never bound what goes into the dedupe Set.

## Fallback generators
The deterministic fallback question generators (used when the LLM under-delivers) must **widen their candidate space on every loop iteration** (e.g. grow the numeric range by `i`) so they always find a unique, non-blank prompt regardless of how large `seen` is. A fixed try-count (e.g. 50 attempts) can exhaust and return a blank/duplicate prompt — never do that.

## How to apply
Any AI-generated, retakeable question/problem surface in this app (practice assignments have the same pattern — see practice-assignment-guarantees.md) must: (1) dedupe against full history, (2) bound only the model-facing sample, (3) use widening-space fallbacks that cannot return empty.
