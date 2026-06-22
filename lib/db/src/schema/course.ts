import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  blurb: text("blurb"),
  position: integer("position").notNull().default(0),
});

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  bodyMedium: text("body_medium"),
  bodyLong: text("body_long"),
});

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // homework | test | midterm | final
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  position: integer("position").notNull().default(0),
  isTimed: boolean("is_timed").notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  instructions: text("instructions"),
});

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
});

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"),
});

export const answersTable = pgTable("answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  bulkInsertCount: integer("bulk_insert_count").notNull().default(0),
  longestBulkInsertChars: integer("longest_bulk_insert_chars").notNull().default(0),
  rewriteSegments: integer("rewrite_segments").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  aiScore: doublePrecision("ai_score"),
  aiFlagged: boolean("ai_flagged"),
  diachronicScore: doublePrecision("diachronic_score"),
  diachronicFlagged: boolean("diachronic_flagged"),
  detectionRationale: text("detection_rationale"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceSessionsTable = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number"),
  topicId: integer("topic_id"),
  tutorEnabled: boolean("tutor_enabled").notNull().default(false),
  focusOnWeaknesses: boolean("focus_on_weaknesses").notNull().default(true),
  difficulty: doublePrecision("difficulty").notNull().default(2.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceProblemsTable = pgTable("practice_problems", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAttemptsTable = pgTable("practice_attempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => practiceProblemsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  trace: jsonb("trace"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Practice Assignments: unlimited, AI-generated "mock" versions of a real
// graded assignment. Questions never reuse the real assignment's problems and
// never repeat across a user's prior practice runs. These exist purely for
// low-stakes practice with heavy feedback + dialogue + the live tutor.
// ---------------------------------------------------------------------------
export const practiceAssignmentAttemptsTable = pgTable("practice_assignment_attempts", {
  id: serial("id").primaryKey(),
  sourceAssignmentId: integer("source_assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  difficulty: doublePrecision("difficulty").notNull().default(2.5),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"),
  readinessLabel: text("readiness_label"), // ready | almost | not_ready
  readinessSummary: text("readiness_summary"),
  focusPointers: jsonb("focus_pointers"), // string[]
});

export const practiceAssignmentProblemsTable = pgTable("practice_assignment_problems", {
  id: serial("id").primaryKey(),
  practiceAttemptId: integer("practice_attempt_id")
    .notNull()
    .references(() => practiceAssignmentAttemptsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: doublePrecision("difficulty").notNull().default(2.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAssignmentAnswersTable = pgTable("practice_assignment_answers", {
  id: serial("id").primaryKey(),
  practiceProblemId: integer("practice_problem_id")
    .notNull()
    .references(() => practiceAssignmentProblemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  trace: jsonb("trace"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAssignmentMessagesTable = pgTable("practice_assignment_messages", {
  id: serial("id").primaryKey(),
  practiceAttemptId: integer("practice_attempt_id")
    .notNull()
    .references(() => practiceAssignmentAttemptsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Diagnostic Assessments: mandatory-for-credit but ungraded-for-score tests.
// There are seven "slots" (pre-course aptitude, after each week, plus two
// cumulative checkpoints) and four formats each (multiple_choice, written,
// hybrid, official). Only the OFFICIAL format of each slot is required; simply
// completing it earns full credit (diagnostics = 20% of the course grade) no
// matter the score. They are also instructive: every attempt is freshly
// AI-generated with no repeated questions, so the student can retake forever.
// "Custom" attempts (slug = "custom") let the student target a free-text scope.
// ---------------------------------------------------------------------------
export const assessmentAttemptsTable = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(), // pre_course | week1 | week2_only | week1_2 | week3 | week4_only | week1_4 | custom
  format: text("format").notNull(), // multiple_choice | written | hybrid | official
  isCustom: boolean("is_custom").notNull().default(false),
  title: text("title").notNull(),
  scope: text("scope"), // free-text scope (custom assessments only)
  weeks: jsonb("weeks").notNull().default([]), // number[]
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"), // informational only; never affects credit
  completed: boolean("completed").notNull().default(false),
  summary: text("summary"),
  focusPointers: jsonb("focus_pointers"), // string[]
});

export const assessmentQuestionsTable = pgTable("assessment_questions", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => assessmentAttemptsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  type: text("type").notNull(), // multiple_choice | written
  topicId: integer("topic_id").references(() => topicsTable.id),
  weekNumber: integer("week_number"),
  prompt: text("prompt").notNull(),
  choices: jsonb("choices"), // string[] for multiple_choice; null for written
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
});

export const assessmentAnswersTable = pgTable("assessment_answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => assessmentQuestionsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  trace: jsonb("trace"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
