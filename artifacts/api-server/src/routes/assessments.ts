import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  assessmentAttemptsTable,
  assessmentQuestionsTable,
  assessmentAnswersTable,
} from "@workspace/db";
import {
  ListAssessmentSlotsResponse,
  GetAssessmentProgressResponse,
  StartAssessmentBody,
  StartAssessmentResponse,
  GetAssessmentAttemptResponse,
  SaveAssessmentAnswerBody,
  SaveAssessmentAnswerResponse,
  SubmitAssessmentResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";
import {
  SLOTS,
  FORMATS,
  FORMAT_ORDER,
  REQUIRED_SLOT_COUNT,
  DIAGNOSTIC_GRADE_WEIGHT,
  getSlot,
  questionPlan,
  isAssessmentFormat,
  type AssessmentFormat,
  type SlotDef,
} from "../lib/assessments";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

type QType = "multiple_choice" | "written";

// ---------------------------------------------------------------------------
// GET /assessments/slots — the seven slots + per-format completion status
// ---------------------------------------------------------------------------
router.get("/assessments/slots", async (_req, res): Promise<void> => {
  // All non-custom attempts, used to compute per-slot/per-format status.
  const attempts = await db
    .select({
      slug: assessmentAttemptsTable.slug,
      format: assessmentAttemptsTable.format,
      completed: assessmentAttemptsTable.completed,
      scorePercent: assessmentAttemptsTable.scorePercent,
      submittedAt: assessmentAttemptsTable.submittedAt,
    })
    .from(assessmentAttemptsTable)
    .where(eq(assessmentAttemptsTable.isCustom, false));

  const slots = SLOTS.map((slot) => {
    const formats = FORMAT_ORDER.map((fmt) => {
      const matching = attempts.filter(
        (a) => a.slug === slot.slug && a.format === fmt,
      );
      const completedAttempts = matching.filter((a) => a.completed);
      const last = completedAttempts
        .slice()
        .sort(
          (a, b) =>
            (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0),
        )[0];
      return {
        format: fmt,
        label: FORMATS[fmt].label,
        questionCount: FORMATS[fmt].questionCount,
        attemptCount: matching.length,
        completed: completedAttempts.length > 0,
        required: fmt === "official",
        lastScorePercent: last?.scorePercent ?? null,
      };
    });
    const officialCompleted =
      formats.find((f) => f.format === "official")?.completed ?? false;
    return {
      slug: slot.slug,
      title: slot.title,
      phase: slot.phase,
      phaseLabel: slot.phaseLabel,
      order: slot.order,
      weeks: slot.weeks,
      aptitude: slot.aptitude,
      description: slot.description,
      officialCompleted,
      formats,
    };
  });

  res.json(ListAssessmentSlotsResponse.parse(slots));
});

// ---------------------------------------------------------------------------
// GET /assessments/progress — diagnostic credit + tracking
// ---------------------------------------------------------------------------
router.get("/assessments/progress", async (_req, res): Promise<void> => {
  const attempts = await db
    .select()
    .from(assessmentAttemptsTable)
    .orderBy(desc(assessmentAttemptsTable.id));

  // Credit: distinct slots whose OFFICIAL format has been completed.
  const completedOfficialSlugs = new Set(
    attempts
      .filter((a) => !a.isCustom && a.format === "official" && a.completed)
      .map((a) => a.slug),
  );
  const officialCompleted = completedOfficialSlugs.size;
  const creditPercent = (officialCompleted / REQUIRED_SLOT_COUNT) * 100;

  const submitted = attempts.filter(
    (a) => a.status === "submitted" && a.scorePercent != null,
  );
  const averageScorePercent =
    submitted.length === 0
      ? null
      : Number(
          (
            submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) /
            submitted.length
          ).toFixed(2),
        );

  const recentAttempts = attempts.slice(0, 20).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    format: a.format as AssessmentFormat,
    isCustom: a.isCustom,
    status: a.status as "in_progress" | "submitted",
    completed: a.completed,
    scorePercent: a.scorePercent ?? null,
    at: (a.submittedAt ?? a.startedAt).toISOString(),
  }));

  res.json(
    GetAssessmentProgressResponse.parse({
      officialCompleted,
      officialTotal: REQUIRED_SLOT_COUNT,
      creditPercent: Number(creditPercent.toFixed(2)),
      gradeWeight: DIAGNOSTIC_GRADE_WEIGHT,
      completedSlugs: [...completedOfficialSlugs],
      totalAttempts: attempts.length,
      averageScorePercent,
      recentAttempts,
    }),
  );
});

// ---------------------------------------------------------------------------
// Load a full attempt (questions + saved answers); hide answer keys until
// the attempt has been submitted.
// ---------------------------------------------------------------------------
async function loadAttempt(attemptId: number) {
  const [attempt] = await db
    .select()
    .from(assessmentAttemptsTable)
    .where(eq(assessmentAttemptsTable.id, attemptId));
  if (!attempt) return null;

  const questions = await db
    .select({
      id: assessmentQuestionsTable.id,
      position: assessmentQuestionsTable.position,
      type: assessmentQuestionsTable.type,
      topicId: assessmentQuestionsTable.topicId,
      weekNumber: assessmentQuestionsTable.weekNumber,
      prompt: assessmentQuestionsTable.prompt,
      choices: assessmentQuestionsTable.choices,
      correctAnswer: assessmentQuestionsTable.correctAnswer,
      explanation: assessmentQuestionsTable.explanation,
      topicTitle: topicsTable.title,
    })
    .from(assessmentQuestionsTable)
    .leftJoin(topicsTable, eq(assessmentQuestionsTable.topicId, topicsTable.id))
    .where(eq(assessmentQuestionsTable.attemptId, attemptId))
    .orderBy(asc(assessmentQuestionsTable.position));

  const questionIds = questions.map((q) => q.id);
  const answers =
    questionIds.length > 0
      ? await db
          .select()
          .from(assessmentAnswersTable)
          .where(inArray(assessmentAnswersTable.questionId, questionIds))
      : [];
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const submittedView = attempt.status === "submitted";

  return {
    id: attempt.id,
    slug: attempt.slug,
    title: attempt.title,
    format: attempt.format as AssessmentFormat,
    isCustom: attempt.isCustom,
    scope: attempt.scope ?? null,
    weeks: Array.isArray(attempt.weeks) ? (attempt.weeks as number[]) : [],
    aptitude: getSlot(attempt.slug)?.aptitude ?? false,
    status: attempt.status as "in_progress" | "submitted",
    completed: attempt.completed,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    scorePercent: attempt.scorePercent ?? null,
    summary: attempt.summary ?? null,
    focusPointers: Array.isArray(attempt.focusPointers)
      ? (attempt.focusPointers as string[])
      : [],
    questions: questions.map((q) => {
      const a = answerByQuestion.get(q.id);
      return {
        id: q.id,
        position: q.position,
        type: q.type as QType,
        topicId: q.topicId ?? null,
        weekNumber: q.weekNumber ?? null,
        topicTitle: q.topicTitle ?? null,
        prompt: q.prompt,
        choices: Array.isArray(q.choices) ? (q.choices as string[]) : null,
        yourAnswer: a?.answer ?? null,
        correct: submittedView ? (a?.correct ?? false) : null,
        feedback: submittedView ? (a?.feedback ?? null) : null,
        correctAnswer: submittedView ? q.correctAnswer : null,
        explanation: submittedView ? q.explanation : null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Resolve the topic context (titles + blurbs) for a set of weeks.
// ---------------------------------------------------------------------------
async function topicsForWeeks(
  weeks: number[],
): Promise<Array<{ id: number; title: string; blurb: string | null; weekNumber: number }>> {
  const all = await db.select().from(topicsTable).orderBy(asc(topicsTable.position));
  if (weeks.length === 0) return all.map((t) => ({ id: t.id, title: t.title, blurb: t.blurb, weekNumber: t.weekNumber }));
  return all
    .filter((t) => weeks.includes(t.weekNumber))
    .map((t) => ({ id: t.id, title: t.title, blurb: t.blurb, weekNumber: t.weekNumber }));
}

type GeneratedQuestion = {
  type: QType;
  prompt: string;
  choices?: string[] | null;
  correctAnswer: string;
  explanation: string;
  topicId?: number | null;
  weekNumber?: number | null;
};

function normalizePrompt(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// POST /assessments/start — generate a fresh attempt
// ---------------------------------------------------------------------------
router.post("/assessments/start", async (req, res): Promise<void> => {
  const parsed = StartAssessmentBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const format = body.format;
  if (!isAssessmentFormat(format)) {
    res.status(400).json({ error: "invalid format" });
    return;
  }

  const isCustom = body.isCustom === true || body.slug === "custom" || !body.slug;
  let slug: string;
  let title: string;
  let weeks: number[];
  let scope: string | null = null;
  let aptitude = false;
  let slotDescription = "";

  if (isCustom) {
    slug = "custom";
    weeks = Array.isArray(body.weeks) ? body.weeks.filter((w) => w >= 1 && w <= 4) : [];
    scope = body.scope?.trim() || null;
    const scopeBits: string[] = [];
    if (weeks.length > 0) scopeBits.push(`Weeks ${weeks.join(", ")}`);
    if (scope) scopeBits.push(scope);
    title = `Custom Assessment${scopeBits.length ? " — " + scopeBits.join(" · ") : ""}`;
  } else {
    const slot = getSlot(body.slug!) as SlotDef | undefined;
    if (!slot) {
      res.status(400).json({ error: "unknown slug" });
      return;
    }
    slug = slot.slug;
    title = `${slot.title} — ${FORMATS[format].label}`;
    weeks = slot.weeks;
    aptitude = slot.aptitude;
    slotDescription = slot.description;
  }

  // Avoid-list: EVERY prior prompt the student has seen for this slug + format
  // (custom assessments share a single "custom" pool), so retakes never repeat
  // a question. We fetch the full history — not a capped window — so dedupe is
  // durable no matter how many times a diagnostic is retaken. Only a bounded
  // recent sample is later handed to the model as guidance (see generateQuestions).
  const priorRows = await db
    .select({ prompt: assessmentQuestionsTable.prompt })
    .from(assessmentQuestionsTable)
    .innerJoin(
      assessmentAttemptsTable,
      eq(assessmentQuestionsTable.attemptId, assessmentAttemptsTable.id),
    )
    .where(
      and(
        eq(assessmentAttemptsTable.slug, slug),
        eq(assessmentAttemptsTable.format, format),
      ),
    )
    .orderBy(desc(assessmentQuestionsTable.id));
  const avoidPrompts = priorRows.map((r) => r.prompt);

  const topics = await topicsForWeeks(weeks);
  const plan = questionPlan(format);

  const generated = await generateQuestions({
    multipleChoice: plan.multipleChoice,
    written: plan.written,
    topics,
    aptitude,
    scope,
    slotDescription,
    avoidPrompts,
  });

  if (generated.length === 0) {
    res.status(502).json({ error: "could not generate questions, please try again" });
    return;
  }

  const [attempt] = await db
    .insert(assessmentAttemptsTable)
    .values({
      slug,
      format,
      isCustom,
      title,
      scope,
      weeks,
      status: "in_progress",
    })
    .returning();
  if (!attempt) {
    res.status(500).json({ error: "failed to create attempt" });
    return;
  }

  await db.insert(assessmentQuestionsTable).values(
    generated.map((g, i) => ({
      attemptId: attempt.id,
      position: i + 1,
      type: g.type,
      topicId: g.topicId ?? null,
      weekNumber: g.weekNumber ?? null,
      prompt: g.prompt,
      choices: g.type === "multiple_choice" ? (g.choices ?? []) : null,
      correctAnswer: g.correctAnswer,
      explanation: g.explanation,
    })),
  );

  const full = await loadAttempt(attempt.id);
  res.json(StartAssessmentResponse.parse(full));
});

// ---------------------------------------------------------------------------
// AI generation of a mixed batch of MC + written questions.
// ---------------------------------------------------------------------------
async function generateQuestions(opts: {
  multipleChoice: number;
  written: number;
  topics: Array<{ id: number; title: string; weekNumber: number; blurb: string | null }>;
  aptitude: boolean;
  scope: string | null;
  slotDescription: string;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion[]> {
  const total = opts.multipleChoice + opts.written;
  if (total === 0) return [];

  const topicList = opts.topics.map((t) => ({
    topicId: t.id,
    title: t.title,
    week: t.weekNumber,
    blurb: t.blurb ?? "",
  }));

  const scopeLine = opts.aptitude
    ? "This is a PRE-COURSE aptitude check. Do NOT assume any course content has been taught. Test general quantitative-reasoning aptitude: number sense, estimation, orders of magnitude, reading simple quantitative claims, and basic proportional thinking."
    : opts.scope
      ? `Target this student-specified scope precisely: "${opts.scope}". Stay within the listed topics where possible.`
      : `Cover the listed course topics, distributing questions across them.`;

  const system =
    "You write diagnostic-assessment questions for a college quantitative-reasoning course. " +
    "Return a JSON object with a `questions` array. " +
    "Each question is an object with: " +
    '`type` ("multiple_choice" or "written"), ' +
    "`topicId` (one of the provided topicIds, or null if aptitude/general), " +
    "`week` (integer or null), " +
    "`prompt` (the question text), " +
    "`choices` (for multiple_choice: an array of exactly 4 option strings; for written: null), " +
    "`correctAnswer` (for multiple_choice: the EXACT text of the correct option; for written: a concise model answer), " +
    "and `explanation` (a full worked solution / rationale). " +
    "Every question must be ENTIRELY NEW — a different scenario and different numbers from every prompt in the avoid-list. Never reuse or lightly reword an avoid-list prompt. " +
    "Make exactly the requested number of each type.";

  const user = JSON.stringify({
    instructions: scopeLine,
    counts: { multiple_choice: opts.multipleChoice, written: opts.written },
    topics: topicList,
    avoid: opts.avoidPrompts.slice(-120),
  });

  let out: { questions?: GeneratedQuestion[] } = {};
  try {
    out = await chatJson<{ questions?: GeneratedQuestion[] }>(system, user);
  } catch {
    out = {};
  }

  const seen = new Set(opts.avoidPrompts.map(normalizePrompt));
  const valid: GeneratedQuestion[] = [];
  const mc: GeneratedQuestion[] = [];
  const written: GeneratedQuestion[] = [];

  for (const q of out.questions ?? []) {
    if (!q || !q.prompt || !q.correctAnswer) continue;
    if (seen.has(normalizePrompt(q.prompt))) continue;
    const type: QType = q.type === "multiple_choice" ? "multiple_choice" : "written";
    if (type === "multiple_choice") {
      const choices = Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [];
      if (choices.length < 2) continue;
      if (!choices.includes(q.correctAnswer)) choices[0] = q.correctAnswer;
      seen.add(normalizePrompt(q.prompt));
      mc.push({ ...q, type, choices, explanation: q.explanation ?? "" });
    } else {
      seen.add(normalizePrompt(q.prompt));
      written.push({ ...q, type, choices: null, explanation: q.explanation ?? "" });
    }
  }

  // Fill from fallbacks if the model under-delivered on either type.
  while (mc.length < opts.multipleChoice) {
    const fb = fallbackMultipleChoice(seen);
    seen.add(normalizePrompt(fb.prompt));
    mc.push(fb);
  }
  while (written.length < opts.written) {
    const fb = fallbackWritten(seen);
    seen.add(normalizePrompt(fb.prompt));
    written.push(fb);
  }

  // Interleave so MC and written alternate, capping at requested counts.
  valid.push(...mc.slice(0, opts.multipleChoice), ...written.slice(0, opts.written));
  return valid;
}

// Unique-by-construction fallbacks so generation never blocks on LLM failure.
// The candidate space WIDENS on every attempt, so a unique, non-blank prompt is
// always found no matter how many prior prompts are in `seen` — there is no
// arbitrary cap that could force a repeat or an empty question.
function fallbackMultipleChoice(seen: Set<string>): GeneratedQuestion {
  for (let i = 0; ; i++) {
    const base = 20 + Math.floor(Math.random() * (180 + i * 50));
    const pct = 5 + Math.floor(Math.random() * 90);
    const prompt = `A quantity of ${base} increases by ${pct}%. What is the new value?`;
    if (seen.has(normalizePrompt(prompt))) continue;
    const ans = Math.round(base * (1 + pct / 100) * 100) / 100;
    return {
      type: "multiple_choice",
      prompt,
      choices: shuffle([
        String(ans),
        String(Math.round(base * (1 - pct / 100) * 100) / 100),
        String(base + pct),
        String(Math.round(base * (1 + pct / 50) * 100) / 100),
      ]),
      correctAnswer: String(ans),
      explanation: `Increasing ${base} by ${pct}% multiplies it by (1 + ${pct}/100). The correct value is ${ans}.`,
      topicId: null,
      weekNumber: null,
    };
  }
}

function fallbackWritten(seen: Set<string>): GeneratedQuestion {
  for (let i = 0; ; i++) {
    const a = 2 + Math.floor(Math.random() * (9 + i));
    const b = 2 + Math.floor(Math.random() * (9 + i));
    const total = 100 + Math.floor(Math.random() * (400 + i * 100));
    const prompt = `A recipe uses flour and sugar in a ${a}:${b} ratio. If you use ${total} grams total, how many grams are flour? Show your reasoning.`;
    if (seen.has(normalizePrompt(prompt))) continue;
    const correct = String(Math.round((total * a) / (a + b)));
    return {
      type: "written",
      prompt,
      choices: null,
      correctAnswer: correct,
      explanation: `The flour share is a/(a+b) = ${a}/${a + b} of the total. The flour amount is ${correct} grams.`,
      topicId: null,
      weekNumber: null,
    };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ---------------------------------------------------------------------------
// GET /assessments/attempts/:attemptId
// ---------------------------------------------------------------------------
router.get("/assessments/attempts/:attemptId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const full = await loadAttempt(id);
  if (!full) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  res.json(GetAssessmentAttemptResponse.parse(full));
});

// ---------------------------------------------------------------------------
// PUT /assessments/attempts/:attemptId/answer
// ---------------------------------------------------------------------------
router.put("/assessments/attempts/:attemptId/answer", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SaveAssessmentAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { questionId, answer, trace } = parsed.data;

  const [attempt] = await db
    .select()
    .from(assessmentAttemptsTable)
    .where(eq(assessmentAttemptsTable.id, id));
  if (!attempt) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(400).json({ error: "attempt already submitted" });
    return;
  }

  const [question] = await db
    .select()
    .from(assessmentQuestionsTable)
    .where(
      and(
        eq(assessmentQuestionsTable.id, questionId),
        eq(assessmentQuestionsTable.attemptId, id),
      ),
    );
  if (!question) {
    res.status(404).json({ error: "question not in this attempt" });
    return;
  }

  const [existing] = await db
    .select()
    .from(assessmentAnswersTable)
    .where(eq(assessmentAnswersTable.questionId, questionId));

  const values = {
    questionId,
    answer,
    trace: trace ?? null,
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(assessmentAnswersTable)
      .set(values)
      .where(eq(assessmentAnswersTable.id, existing.id));
  } else {
    await db.insert(assessmentAnswersTable).values(values);
  }
  res.json(SaveAssessmentAnswerResponse.parse({ ok: true }));
});

// ---------------------------------------------------------------------------
// POST /assessments/attempts/:attemptId/submit
// ---------------------------------------------------------------------------
router.post("/assessments/attempts/:attemptId/submit", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [attempt] = await db
    .select()
    .from(assessmentAttemptsTable)
    .where(eq(assessmentAttemptsTable.id, id));
  if (!attempt) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }

  // Idempotent: already submitted → return stored view.
  if (attempt.status === "submitted") {
    const full = await loadAttempt(id);
    res.json(SubmitAssessmentResponse.parse(full));
    return;
  }

  const questions = await db
    .select()
    .from(assessmentQuestionsTable)
    .where(eq(assessmentQuestionsTable.attemptId, id))
    .orderBy(asc(assessmentQuestionsTable.position));

  const questionIds = questions.map((q) => q.id);
  const answers =
    questionIds.length > 0
      ? await db
          .select()
          .from(assessmentAnswersTable)
          .where(inArray(assessmentAnswersTable.questionId, questionIds))
      : [];
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  // Grade: MC = exact option match; written = AI conceptual grading.
  const graded = await Promise.all(
    questions.map(async (q) => {
      const userAnswer = answerByQuestion.get(q.id)?.answer ?? "";
      if (userAnswer.trim().length === 0) {
        return { q, userAnswer, correct: false, explanation: q.explanation };
      }
      if (q.type === "multiple_choice") {
        const correct =
          userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        return { q, userAnswer, correct, explanation: q.explanation };
      }
      const g = await gradeAnswer({
        prompt: q.prompt,
        correctAnswer: q.correctAnswer,
        userAnswer,
      });
      return { q, userAnswer, correct: g.correct, explanation: g.explanation };
    }),
  );

  const feedbackByPosition = await generateFeedback(graded);

  let score = 0;
  for (const row of graded) {
    if (row.correct) score += 1;
    const feedback = feedbackByPosition.get(row.q.position) ?? row.explanation;
    const existing = answerByQuestion.get(row.q.id);
    if (existing) {
      await db
        .update(assessmentAnswersTable)
        .set({ correct: row.correct, feedback })
        .where(eq(assessmentAnswersTable.id, existing.id));
    } else {
      await db.insert(assessmentAnswersTable).values({
        questionId: row.q.id,
        answer: "",
        correct: row.correct,
        feedback,
      });
    }
  }

  const total = questions.length;
  const percent = total === 0 ? 0 : (score / total) * 100;

  const { summary, focusPointers } = await buildSummary(graded, percent, attempt.title);

  await db
    .update(assessmentAttemptsTable)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      scorePercent: Number(percent.toFixed(2)),
      completed: true, // completion = full credit regardless of score
      summary,
      focusPointers,
    })
    .where(eq(assessmentAttemptsTable.id, id));

  const full = await loadAttempt(id);
  res.json(SubmitAssessmentResponse.parse(full));
});

type GradedRow = {
  q: typeof assessmentQuestionsTable.$inferSelect;
  userAnswer: string;
  correct: boolean;
  explanation: string;
};

async function generateFeedback(graded: GradedRow[]): Promise<Map<number, string>> {
  const byPosition = new Map<number, string>();
  if (graded.length === 0) return byPosition;
  try {
    const out = await chatJson<{ feedback?: Array<{ position: number; text: string }> }>(
      "You are a supportive quantitative-reasoning tutor giving per-question feedback on a diagnostic. " +
        "For each question, write 1-3 sentences: affirm what was right or pinpoint the misconception, then the key takeaway. " +
        'Strict JSON: {"feedback": [{"position": number, "text": string}]} with one entry per question.',
      JSON.stringify(
        graded.map((r) => ({
          position: r.q.position,
          prompt: r.q.prompt,
          correctAnswer: r.q.correctAnswer,
          studentAnswer: r.userAnswer,
          correct: r.correct,
        })),
      ),
    );
    for (const f of out.feedback ?? []) {
      if (typeof f?.position === "number" && f.text) byPosition.set(f.position, f.text);
    }
  } catch {
    /* fall back to explanations */
  }
  for (const r of graded) {
    if (!byPosition.has(r.q.position)) {
      byPosition.set(
        r.q.position,
        r.correct ? `Correct. ${r.explanation}` : r.explanation,
      );
    }
  }
  return byPosition;
}

async function buildSummary(
  graded: GradedRow[],
  percent: number,
  title: string,
): Promise<{ summary: string; focusPointers: string[] }> {
  const wrong = graded.filter((r) => !r.correct);
  try {
    const out = await chatJson<{ summary: string; focusPointers: string[] }>(
      "You are an academic advisor summarizing a diagnostic assessment. The diagnostic is NOT graded for score — completing it earns full credit — so be encouraging. " +
        "Write a 2-3 sentence summary of how the student did and what to study next, then 2-4 short focus pointers. " +
        'Strict JSON: {"summary": string, "focusPointers": string[]}.',
      JSON.stringify({
        title,
        scorePercent: Number(percent.toFixed(1)),
        missed: wrong.map((r) => ({ prompt: r.q.prompt, correctAnswer: r.q.correctAnswer })),
        total: graded.length,
      }),
    );
    return {
      summary: out.summary || defaultSummary(percent),
      focusPointers: Array.isArray(out.focusPointers) ? out.focusPointers.slice(0, 4) : [],
    };
  } catch {
    return { summary: defaultSummary(percent), focusPointers: [] };
  }
}

function defaultSummary(percent: number): string {
  return `You completed this diagnostic and earned full credit. You answered ${percent.toFixed(
    0,
  )}% correctly — remember, the score itself doesn't affect your grade, but it's a useful signal of where to focus next.`;
}

export default router;
