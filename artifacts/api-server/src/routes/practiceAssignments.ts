import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  problemsTable,
  topicsTable,
  practiceAssignmentAttemptsTable,
  practiceAssignmentProblemsTable,
  practiceAssignmentAnswersTable,
  practiceAssignmentMessagesTable,
} from "@workspace/db";
import {
  CreatePracticeAttemptBody,
  CreatePracticeAttemptResponse,
  ListPracticeAttemptsResponse,
  GetPracticeAttemptResponse,
  SavePracticeAttemptAnswerBody,
  SavePracticeAttemptAnswerResponse,
  SubmitPracticeAttemptResponse,
  SendPracticeAttemptMessageBody,
  SendPracticeAttemptMessageResponse,
} from "@workspace/api-zod";
import { chatJson, chatText } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

type AssignmentKind = "homework" | "test" | "midterm" | "final";
type ReadinessLabel = "ready" | "almost" | "not_ready";

// Higher-stakes assignments practice at a higher baseline difficulty.
function baseDifficultyFor(kind: AssignmentKind): number {
  switch (kind) {
    case "final":
      return 4.0;
    case "midterm":
      return 3.6;
    case "test":
      return 3.2;
    default:
      return 2.5;
  }
}

// ---------------------------------------------------------------------------
// Load a full practice attempt (problems + saved answers + messages + result)
// ---------------------------------------------------------------------------
async function loadPracticeAttempt(attemptId: number) {
  const [attempt] = await db
    .select()
    .from(practiceAssignmentAttemptsTable)
    .where(eq(practiceAssignmentAttemptsTable.id, attemptId));
  if (!attempt) return null;

  const [source] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, attempt.sourceAssignmentId));

  const problems = await db
    .select({
      id: practiceAssignmentProblemsTable.id,
      position: practiceAssignmentProblemsTable.position,
      prompt: practiceAssignmentProblemsTable.prompt,
      correctAnswer: practiceAssignmentProblemsTable.correctAnswer,
      explanation: practiceAssignmentProblemsTable.explanation,
      topicId: practiceAssignmentProblemsTable.topicId,
      topicTitle: topicsTable.title,
    })
    .from(practiceAssignmentProblemsTable)
    .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
    .where(eq(practiceAssignmentProblemsTable.practiceAttemptId, attemptId))
    .orderBy(asc(practiceAssignmentProblemsTable.position));

  const problemIds = problems.map((p) => p.id);
  const answers =
    problemIds.length > 0
      ? await db
          .select()
          .from(practiceAssignmentAnswersTable)
          .where(inArray(practiceAssignmentAnswersTable.practiceProblemId, problemIds))
      : [];
  const answerByProblem = new Map(answers.map((a) => [a.practiceProblemId, a]));

  const messages = await db
    .select()
    .from(practiceAssignmentMessagesTable)
    .where(eq(practiceAssignmentMessagesTable.practiceAttemptId, attemptId))
    .orderBy(asc(practiceAssignmentMessagesTable.id));

  const savedAnswers = answers
    .filter((a) => a.answer != null && a.answer.length > 0)
    .map((a) => ({ problemId: a.practiceProblemId, answer: a.answer }));

  let result: ReturnType<typeof buildResult> | null = null;
  if (attempt.status === "submitted") {
    result = buildResult(attempt, problems, answerByProblem);
  }

  return {
    id: attempt.id,
    sourceAssignmentId: attempt.sourceAssignmentId,
    sourceTitle: source?.title ?? "Assignment",
    kind: (source?.kind ?? "homework") as AssignmentKind,
    weekNumber: source?.weekNumber ?? 1,
    status: attempt.status as "in_progress" | "submitted",
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    difficulty: attempt.difficulty,
    problems: problems.map((p) => ({
      id: p.id,
      position: p.position,
      prompt: p.prompt,
      topicId: p.topicId,
      topicTitle: p.topicTitle ?? null,
    })),
    savedAnswers,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      at: m.createdAt.toISOString(),
    })),
    result,
  };
}

function buildResult(
  attempt: typeof practiceAssignmentAttemptsTable.$inferSelect,
  problems: Array<{
    id: number;
    position: number;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    topicTitle: string | null;
  }>,
  answerByProblem: Map<number, typeof practiceAssignmentAnswersTable.$inferSelect>,
) {
  let score = 0;
  const perProblem = problems.map((p) => {
    const a = answerByProblem.get(p.id);
    const correct = a?.correct ?? false;
    if (correct) score += 1;
    return {
      problemId: p.id,
      position: p.position,
      prompt: p.prompt,
      correct,
      userAnswer: a?.answer ?? "",
      correctAnswer: p.correctAnswer,
      explanation: p.explanation,
      feedback: a?.feedback ?? "",
      topicTitle: p.topicTitle ?? null,
    };
  });
  const total = problems.length;
  const percent = total === 0 ? 0 : (score / total) * 100;
  const focusPointers = Array.isArray(attempt.focusPointers)
    ? (attempt.focusPointers as string[])
    : [];
  return {
    practiceAttemptId: attempt.id,
    score,
    total,
    percent: Number(percent.toFixed(2)),
    perProblem,
    focusPointers,
    readinessLabel: (attempt.readinessLabel ?? "not_ready") as ReadinessLabel,
    readinessSummary: attempt.readinessSummary ?? "",
  };
}

// ---------------------------------------------------------------------------
// GET /assignments/:assignmentId/practice-attempts  — history
// ---------------------------------------------------------------------------
router.get(
  "/assignments/:assignmentId/practice-attempts",
  async (req, res): Promise<void> => {
    const assignmentId = parseIdParam(req.params.assignmentId);
    if (!Number.isFinite(assignmentId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const attempts = await db
      .select()
      .from(practiceAssignmentAttemptsTable)
      .where(eq(practiceAssignmentAttemptsTable.sourceAssignmentId, assignmentId))
      .orderBy(desc(practiceAssignmentAttemptsTable.id));

    const counts = await db
      .select({
        practiceAttemptId: practiceAssignmentProblemsTable.practiceAttemptId,
        n: sql<number>`count(*)::int`,
      })
      .from(practiceAssignmentProblemsTable)
      .groupBy(practiceAssignmentProblemsTable.practiceAttemptId);
    const countById = new Map(counts.map((c) => [c.practiceAttemptId, Number(c.n)]));

    res.json(
      ListPracticeAttemptsResponse.parse(
        attempts.map((a) => ({
          id: a.id,
          sourceAssignmentId: a.sourceAssignmentId,
          status: a.status as "in_progress" | "submitted",
          startedAt: a.startedAt.toISOString(),
          submittedAt: a.submittedAt?.toISOString() ?? null,
          scorePercent: a.scorePercent ?? null,
          problemCount: countById.get(a.id) ?? 0,
        })),
      ),
    );
  },
);

// ---------------------------------------------------------------------------
// POST /assignments/:assignmentId/practice-attempts  — generate a fresh run
// ---------------------------------------------------------------------------
router.post(
  "/assignments/:assignmentId/practice-attempts",
  async (req, res): Promise<void> => {
    const assignmentId = parseIdParam(req.params.assignmentId);
    if (!Number.isFinite(assignmentId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = CreatePracticeAttemptBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const focus = parsed.data.focus?.trim() || "";

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId));
    if (!assignment) {
      res.status(404).json({ error: "assignment not found" });
      return;
    }

    // Slots mirror the real assignment's topic mix and length.
    const realProblems = await db
      .select({
        position: problemsTable.position,
        prompt: problemsTable.prompt,
        topicId: problemsTable.topicId,
        topicTitle: topicsTable.title,
      })
      .from(problemsTable)
      .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
      .where(eq(problemsTable.assignmentId, assignmentId))
      .orderBy(asc(problemsTable.position));

    if (realProblems.length === 0) {
      res.status(400).json({ error: "assignment has no problems to mirror" });
      return;
    }

    // Avoid list: the real graded prompts + every prompt the student has ever
    // seen in a prior practice run of this assignment. Never reuse a question.
    const priorPractice = await db
      .select({ prompt: practiceAssignmentProblemsTable.prompt })
      .from(practiceAssignmentProblemsTable)
      .innerJoin(
        practiceAssignmentAttemptsTable,
        eq(
          practiceAssignmentProblemsTable.practiceAttemptId,
          practiceAssignmentAttemptsTable.id,
        ),
      )
      .where(eq(practiceAssignmentAttemptsTable.sourceAssignmentId, assignmentId));
    const avoidPrompts = [
      ...realProblems.map((p) => p.prompt),
      ...priorPractice.map((p) => p.prompt),
    ];

    const kind = assignment.kind as AssignmentKind;
    const difficulty = baseDifficultyFor(kind);

    const [attempt] = await db
      .insert(practiceAssignmentAttemptsTable)
      .values({ sourceAssignmentId: assignmentId, status: "in_progress", difficulty })
      .returning();
    if (!attempt) {
      res.status(500).json({ error: "failed to create attempt" });
      return;
    }

    const slots = realProblems.map((p, i) => ({
      position: i + 1,
      topicId: p.topicId,
      topicTitle: p.topicTitle ?? "quantitative reasoning",
    }));

    const generated = await generateProblems(slots, avoidPrompts, focus, difficulty, kind);

    await db.insert(practiceAssignmentProblemsTable).values(
      slots.map((slot, i) => {
        const g = generated[i]!;
        return {
          practiceAttemptId: attempt.id,
          topicId: slot.topicId,
          position: slot.position,
          prompt: g.prompt,
          correctAnswer: g.correctAnswer,
          explanation: g.explanation,
          difficulty,
        };
      }),
    );

    const full = await loadPracticeAttempt(attempt.id);
    res.json(CreatePracticeAttemptResponse.parse(full));
  },
);

type GeneratedProblem = { prompt: string; correctAnswer: string; explanation: string };

function normalizePrompt(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// Last-resort generator that is unique-by-construction (random numbers), so it
// can never collide with a previously-seen prompt even if every LLM call fails.
function randomizedFallback(slot: { topicTitle: string }): GeneratedProblem {
  const base = 20 + Math.floor(Math.random() * 80); // 20..99
  const markup = 10 + Math.floor(Math.random() * 60); // 10..69
  const discount = 5 + Math.floor(Math.random() * 40); // 5..44
  const afterMarkup = base * (1 + markup / 100);
  const final = Math.round(afterMarkup * (1 - discount / 100) * 100) / 100;
  return {
    prompt: `Practice (${slot.topicTitle}): A $${base} item is marked up ${markup}%, then discounted ${discount}% off the new price. What is the final price, in dollars (rounded to the nearest cent)?`,
    correctAnswer: String(final),
    explanation: `$${base} × ${(1 + markup / 100).toFixed(2)} = $${afterMarkup.toFixed(
      2,
    )}; $${afterMarkup.toFixed(2)} × ${(1 - discount / 100).toFixed(2)} = $${final}. A percentage increase and decrease do not cancel because they apply to different bases.`,
  };
}

async function generateProblems(
  slots: Array<{ position: number; topicId: number; topicTitle: string }>,
  avoidPrompts: string[],
  focus: string,
  difficulty: number,
  kind: AssignmentKind,
): Promise<GeneratedProblem[]> {
  const system =
    "You generate fresh quantitative-reasoning practice problems for a college freshman. " +
    "Each problem must be ENTIRELY NEW: a different real-world scenario and different numbers from every problem in the avoid-list. " +
    "Never copy, lightly reword, or reuse any avoid-list problem. " +
    "Each correctAnswer must be a short string (a number, short phrase, or letter choice), never multi-paragraph. " +
    "The explanation must show the full worked solution step by step. " +
    'Respond as STRICT JSON of the form {"problems": [{"position": number, "prompt": string, "correctAnswer": string, "explanation": string}]} with exactly one entry per requested slot.';

  const user =
    `Generate ${slots.length} practice problems for a ${kind} at difficulty ${difficulty.toFixed(
      1,
    )}/5. One problem per slot, matching the slot's topic:\n` +
    JSON.stringify(slots.map((s) => ({ position: s.position, topic: s.topicTitle }))) +
    (focus ? `\n\nStudent request to honor: ${focus}` : "") +
    `\n\nAVOID these existing problems entirely (do not reuse their scenarios or numbers):\n` +
    JSON.stringify(avoidPrompts);

  let out: { problems?: Array<GeneratedProblem & { position?: number }> } = {};
  try {
    out = await chatJson<{ problems?: Array<GeneratedProblem & { position?: number }> }>(
      system,
      user,
    );
  } catch {
    out = {};
  }

  const byPosition = new Map<number, GeneratedProblem>();
  for (const p of out.problems ?? []) {
    if (typeof p?.position === "number" && p.prompt && p.correctAnswer) {
      byPosition.set(p.position, {
        prompt: p.prompt,
        correctAnswer: p.correctAnswer,
        explanation: p.explanation ?? "",
      });
    }
  }

  // Fill any missing/invalid slots one at a time so a partial batch never blocks.
  // `seen` enforces the hard guarantee: no prompt may match a real graded prompt,
  // a prior practice prompt, or another prompt within this same batch.
  const result: GeneratedProblem[] = [];
  const ordered = [...(out.problems ?? [])].filter((p) => p?.prompt && p?.correctAnswer);
  const seen = new Set(avoidPrompts.map(normalizePrompt));
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]!;
    let g = byPosition.get(slot.position) ?? ordered[i];
    if (!g || !g.prompt || !g.correctAnswer || seen.has(normalizePrompt(g.prompt))) {
      g = await generateOne(slot, [...seen], focus, difficulty);
    }
    if (!g.prompt || seen.has(normalizePrompt(g.prompt))) {
      g = randomizedFallback(slot);
    }
    seen.add(normalizePrompt(g.prompt));
    result.push(g);
  }
  return result;
}

async function generateOne(
  slot: { topicTitle: string },
  avoidPrompts: string[],
  focus: string,
  difficulty: number,
): Promise<GeneratedProblem> {
  try {
    const g = await chatJson<GeneratedProblem>(
      "You generate ONE fresh quantitative-reasoning practice problem. It must use a different scenario and different numbers from every avoid-list problem. The correctAnswer is a short string. The explanation is the full worked solution. Strict JSON: {\"prompt\": string, \"correctAnswer\": string, \"explanation\": string}.",
      `Topic: ${slot.topicTitle}. Difficulty ${difficulty.toFixed(1)}/5.${
        focus ? ` Honor this request: ${focus}.` : ""
      }\nAvoid: ${JSON.stringify(avoidPrompts.slice(-30))}`,
    );
    if (g?.prompt && g?.correctAnswer) return g;
  } catch {
    /* fall through */
  }
  return randomizedFallback(slot);
}

// ---------------------------------------------------------------------------
// GET /practice-attempts/:practiceAttemptId
// ---------------------------------------------------------------------------
router.get("/practice-attempts/:practiceAttemptId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.practiceAttemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const full = await loadPracticeAttempt(id);
  if (!full) {
    res.status(404).json({ error: "practice attempt not found" });
    return;
  }
  res.json(GetPracticeAttemptResponse.parse(full));
});

// ---------------------------------------------------------------------------
// PUT /practice-attempts/:practiceAttemptId/answer
// ---------------------------------------------------------------------------
router.put(
  "/practice-attempts/:practiceAttemptId/answer",
  async (req, res): Promise<void> => {
    const id = parseIdParam(req.params.practiceAttemptId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = SavePracticeAttemptAnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { problemId, answer, trace } = parsed.data;

    const [attempt] = await db
      .select()
      .from(practiceAssignmentAttemptsTable)
      .where(eq(practiceAssignmentAttemptsTable.id, id));
    if (!attempt) {
      res.status(404).json({ error: "practice attempt not found" });
      return;
    }
    if (attempt.status !== "in_progress") {
      res.status(400).json({ error: "practice attempt already submitted" });
      return;
    }

    const [problem] = await db
      .select()
      .from(practiceAssignmentProblemsTable)
      .where(
        and(
          eq(practiceAssignmentProblemsTable.id, problemId),
          eq(practiceAssignmentProblemsTable.practiceAttemptId, id),
        ),
      );
    if (!problem) {
      res.status(404).json({ error: "problem not in this attempt" });
      return;
    }

    const [existing] = await db
      .select()
      .from(practiceAssignmentAnswersTable)
      .where(eq(practiceAssignmentAnswersTable.practiceProblemId, problemId));

    const values = {
      practiceProblemId: problemId,
      answer,
      trace: trace ?? null,
      updatedAt: new Date(),
    };
    if (existing) {
      await db
        .update(practiceAssignmentAnswersTable)
        .set(values)
        .where(eq(practiceAssignmentAnswersTable.id, existing.id));
    } else {
      await db.insert(practiceAssignmentAnswersTable).values(values);
    }
    res.json(SavePracticeAttemptAnswerResponse.parse({ ok: true }));
  },
);

// ---------------------------------------------------------------------------
// POST /practice-attempts/:practiceAttemptId/submit
// ---------------------------------------------------------------------------
router.post(
  "/practice-attempts/:practiceAttemptId/submit",
  async (req, res): Promise<void> => {
    const id = parseIdParam(req.params.practiceAttemptId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const [attempt] = await db
      .select()
      .from(practiceAssignmentAttemptsTable)
      .where(eq(practiceAssignmentAttemptsTable.id, id));
    if (!attempt) {
      res.status(404).json({ error: "practice attempt not found" });
      return;
    }

    // Idempotent: if already submitted, return the stored result.
    if (attempt.status === "submitted") {
      const full = await loadPracticeAttempt(id);
      res.json(SubmitPracticeAttemptResponse.parse(full!.result));
      return;
    }

    const [source] = await db
      .select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, attempt.sourceAssignmentId));

    const problems = await db
      .select({
        id: practiceAssignmentProblemsTable.id,
        position: practiceAssignmentProblemsTable.position,
        prompt: practiceAssignmentProblemsTable.prompt,
        correctAnswer: practiceAssignmentProblemsTable.correctAnswer,
        explanation: practiceAssignmentProblemsTable.explanation,
        topicId: practiceAssignmentProblemsTable.topicId,
        topicTitle: topicsTable.title,
      })
      .from(practiceAssignmentProblemsTable)
      .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
      .where(eq(practiceAssignmentProblemsTable.practiceAttemptId, id))
      .orderBy(asc(practiceAssignmentProblemsTable.position));

    const problemIds = problems.map((p) => p.id);
    const answers =
      problemIds.length > 0
        ? await db
            .select()
            .from(practiceAssignmentAnswersTable)
            .where(inArray(practiceAssignmentAnswersTable.practiceProblemId, problemIds))
        : [];
    const answerByProblem = new Map(answers.map((a) => [a.practiceProblemId, a]));

    // 1. Grade every problem.
    const graded = await Promise.all(
      problems.map(async (p) => {
        const userAnswer = answerByProblem.get(p.id)?.answer ?? "";
        const g =
          userAnswer.trim().length === 0
            ? { correct: false, explanation: p.explanation }
            : await gradeAnswer({
                prompt: p.prompt,
                correctAnswer: p.correctAnswer,
                userAnswer,
              });
        return { problem: p, userAnswer, correct: g.correct, explanation: g.explanation };
      }),
    );

    // 2. Generate rich, per-problem feedback in one batch.
    const feedbackByPosition = await generateFeedback(graded);

    // 3. Persist correctness + feedback (creating answer rows for blanks).
    let score = 0;
    for (const row of graded) {
      if (row.correct) score += 1;
      const feedback = feedbackByPosition.get(row.problem.position) ?? row.explanation;
      const existing = answerByProblem.get(row.problem.id);
      if (existing) {
        await db
          .update(practiceAssignmentAnswersTable)
          .set({ correct: row.correct, feedback })
          .where(eq(practiceAssignmentAnswersTable.id, existing.id));
      } else {
        await db.insert(practiceAssignmentAnswersTable).values({
          practiceProblemId: row.problem.id,
          answer: "",
          correct: row.correct,
          feedback,
        });
      }
    }

    const total = problems.length;
    const percent = total === 0 ? 0 : (score / total) * 100;

    // 4. Surgical, analytics-based focus pointers + readiness verdict.
    const { focusPointers, readinessLabel, readinessSummary } = await buildFocus(
      graded,
      percent,
      (source?.title ?? "the graded assignment"),
    );

    await db
      .update(practiceAssignmentAttemptsTable)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        scorePercent: Number(percent.toFixed(2)),
        readinessLabel,
        readinessSummary,
        focusPointers,
      })
      .where(eq(practiceAssignmentAttemptsTable.id, id));

    const full = await loadPracticeAttempt(id);
    res.json(SubmitPracticeAttemptResponse.parse(full!.result));
  },
);

type GradedRow = {
  problem: {
    id: number;
    position: number;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    topicId: number;
    topicTitle: string | null;
  };
  userAnswer: string;
  correct: boolean;
  explanation: string;
};

async function generateFeedback(graded: GradedRow[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const out = await chatJson<{ items?: Array<{ position: number; feedback: string }> }>(
      "You are a generous, detailed quantitative-reasoning tutor writing personalized feedback on a student's practice attempt. " +
        "For EACH problem, write 3-5 sentences: name what the student did (or that they left it blank), the underlying concept, the correct method walked through step by step, and one concrete thing to watch for next time. Be encouraging but specific. " +
        'Respond as STRICT JSON: {"items": [{"position": number, "feedback": string}]} with one entry per problem.',
      JSON.stringify(
        graded.map((g) => ({
          position: g.problem.position,
          topic: g.problem.topicTitle,
          prompt: g.problem.prompt,
          correctAnswer: g.problem.correctAnswer,
          studentAnswer: g.userAnswer || "(left blank)",
          correct: g.correct,
        })),
      ),
    );
    for (const it of out.items ?? []) {
      if (typeof it?.position === "number" && it.feedback) {
        map.set(it.position, it.feedback);
      }
    }
  } catch {
    /* fall back to explanations below */
  }
  for (const g of graded) {
    if (!map.has(g.problem.position)) {
      const lead = g.correct
        ? "Correct — nicely done. "
        : g.userAnswer.trim().length === 0
          ? "You left this one blank. "
          : `Not quite — you put "${g.userAnswer}", but the answer is ${g.problem.correctAnswer}. `;
      map.set(g.problem.position, lead + (g.explanation || g.problem.explanation));
    }
  }
  return map;
}

async function buildFocus(
  graded: GradedRow[],
  percent: number,
  sourceTitle: string,
): Promise<{
  focusPointers: string[];
  readinessLabel: ReadinessLabel;
  readinessSummary: string;
}> {
  // Per-topic results on THIS attempt.
  const byTopic = new Map<
    number,
    { topicTitle: string; correct: number; total: number }
  >();
  for (const g of graded) {
    const t = byTopic.get(g.problem.topicId) ?? {
      topicTitle: g.problem.topicTitle ?? "topic",
      correct: 0,
      total: 0,
    };
    t.total += 1;
    if (g.correct) t.correct += 1;
    byTopic.set(g.problem.topicId, t);
  }

  // Cross-reference the student's lifetime topic-drill accuracy (their profile).
  const topicIds = [...byTopic.keys()];
  const lifetime = new Map<number, { n: number; acc: number }>();
  if (topicIds.length > 0) {
    const stats = await db.execute(sql`
      select topic_id, count(*)::int as n,
             avg(case when correct then 1.0 else 0.0 end) as acc
      from practice_attempts
      where topic_id in (${sql.join(topicIds, sql`, `)})
      group by topic_id
    `);
    for (const r of stats.rows as Array<{ topic_id: number; n: number; acc: number }>) {
      lifetime.set(Number(r.topic_id), { n: Number(r.n), acc: Number(r.acc) });
    }
  }

  const topicStats = [...byTopic.entries()].map(([topicId, t]) => {
    const lt = lifetime.get(topicId);
    return {
      topicTitle: t.topicTitle,
      attemptAccuracy: t.total === 0 ? 0 : t.correct / t.total,
      attemptMissed: t.total - t.correct,
      lifetimeAccuracy: lt ? Number(lt.acc.toFixed(2)) : null,
      lifetimeAttempts: lt?.n ?? 0,
    };
  });

  const readinessLabel: ReadinessLabel =
    percent >= 85 ? "ready" : percent >= 65 ? "almost" : "not_ready";

  let focusPointers: string[] = [];
  let readinessSummary = "";
  try {
    const out = await chatJson<{ focusPointers?: string[]; readinessSummary?: string }>(
      "You are an academic coach prepping a student for a graded assignment, using their practice results and lifetime per-topic accuracy. " +
        "Write 2-4 SURGICAL, specific focus pointers: name the exact topic, cite the numbers (e.g. 'missed 2 of 3 here, and your lifetime accuracy on this is 41%'), and say precisely what to do before the graded version. " +
        "Then write a 1-2 sentence readiness summary matching the given readiness label. " +
        'Strict JSON: {"focusPointers": string[], "readinessSummary": string}.',
      JSON.stringify({
        gradedAssignment: sourceTitle,
        practicePercent: Number(percent.toFixed(1)),
        readinessLabel,
        perTopic: topicStats,
      }),
    );
    focusPointers = Array.isArray(out.focusPointers)
      ? out.focusPointers.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [];
    readinessSummary = out.readinessSummary?.trim() ?? "";
  } catch {
    /* deterministic fallback below */
  }

  if (focusPointers.length === 0) {
    const weak = topicStats
      .filter((t) => t.attemptMissed > 0)
      .sort((a, b) => b.attemptMissed - a.attemptMissed);
    focusPointers =
      weak.length > 0
        ? weak.map(
            (t) =>
              `${t.topicTitle}: you missed ${t.attemptMissed} here${
                t.lifetimeAccuracy != null
                  ? ` and your lifetime accuracy on it is ${Math.round(
                      t.lifetimeAccuracy * 100,
                    )}%`
                  : ""
              }. Re-read the lecture and run a focused topic-practice set before ${sourceTitle}.`,
          )
        : [`Strong run — keep your pace and review your worked solutions before ${sourceTitle}.`];
  }
  if (!readinessSummary) {
    readinessSummary =
      readinessLabel === "ready"
        ? `You're tracking well for ${sourceTitle}. Do one more practice run to lock it in.`
        : readinessLabel === "almost"
          ? `You're close on ${sourceTitle}. Clear the focus areas above, then run another practice.`
          : `Hold off on ${sourceTitle} for now — work the focus areas above and run more practice first so you don't get blindsided.`;
  }

  return { focusPointers, readinessLabel, readinessSummary };
}

// ---------------------------------------------------------------------------
// POST /practice-attempts/:practiceAttemptId/messages  — feedback dialogue
// ---------------------------------------------------------------------------
router.post(
  "/practice-attempts/:practiceAttemptId/messages",
  async (req, res): Promise<void> => {
    const id = parseIdParam(req.params.practiceAttemptId);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = SendPracticeAttemptMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const message = parsed.data.message.trim();
    if (!message) {
      res.status(400).json({ error: "empty message" });
      return;
    }

    const full = await loadPracticeAttempt(id);
    if (!full) {
      res.status(404).json({ error: "practice attempt not found" });
      return;
    }

    await db.insert(practiceAssignmentMessagesTable).values({
      practiceAttemptId: id,
      role: "user",
      content: message,
    });

    const resultContext = full.result
      ? {
          percent: full.result.percent,
          readiness: full.result.readinessLabel,
          readinessSummary: full.result.readinessSummary,
          focusPointers: full.result.focusPointers,
          problems: full.result.perProblem.map((p) => ({
            position: p.position,
            prompt: p.prompt,
            yourAnswer: p.userAnswer,
            correctAnswer: p.correctAnswer,
            correct: p.correct,
            feedback: p.feedback,
            topic: p.topicTitle,
          })),
        }
      : { note: "This practice attempt has not been submitted yet." };

    const history = full.messages
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");

    const sys =
      "You are the student's personal quantitative-reasoning coach, discussing the results of a practice assignment they just took. " +
      "You have their full graded results and feedback below. Answer their questions directly and specifically, referencing the exact problems and their answers. Be encouraging, concrete, and thorough — walk through methods with real numbers. Help them get genuinely ready for the graded version.";
    const user =
      `PRACTICE RESULTS (for "${full.sourceTitle}"):\n${JSON.stringify(resultContext)}\n\n` +
      `CONVERSATION SO FAR:\n${history}\n\nStudent's latest message: ${message}`;

    let text = "";
    try {
      text = await chatText(sys, user);
    } catch {
      text =
        "I'm having trouble reaching the coaching service right now — try again in a moment. In the meantime, re-read the feedback on the problems you missed.";
    }

    await db.insert(practiceAssignmentMessagesTable).values({
      practiceAttemptId: id,
      role: "assistant",
      content: text,
    });

    const messages = await db
      .select()
      .from(practiceAssignmentMessagesTable)
      .where(eq(practiceAssignmentMessagesTable.practiceAttemptId, id))
      .orderBy(asc(practiceAssignmentMessagesTable.id));

    res.json(
      SendPracticeAttemptMessageResponse.parse({
        text,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          at: m.createdAt.toISOString(),
        })),
      }),
    );
  },
);

export default router;
