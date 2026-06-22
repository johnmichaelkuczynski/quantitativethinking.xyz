// ---------------------------------------------------------------------------
// Static configuration for the diagnostic-assessment system. These definitions
// are the single source of truth for the seven slots and four formats; the API
// exposes them so the frontend never hard-codes the structure.
// ---------------------------------------------------------------------------

export type AssessmentFormat = "multiple_choice" | "written" | "hybrid" | "official";

export interface FormatDef {
  format: AssessmentFormat;
  label: string;
  /** Number of questions generated for a NON-official slot in this format. */
  questionCount: number;
  /** Whether the format includes multiple-choice questions. */
  hasMultipleChoice: boolean;
  /** Whether the format includes written questions. */
  hasWritten: boolean;
}

// "Official" is twice as long as any of the short formats and is always hybrid.
const SHORT_COUNT = 5;
const HYBRID_COUNT = 6;
const OFFICIAL_COUNT = 12;

export const FORMATS: Record<AssessmentFormat, FormatDef> = {
  multiple_choice: {
    format: "multiple_choice",
    label: "Multiple Choice",
    questionCount: SHORT_COUNT,
    hasMultipleChoice: true,
    hasWritten: false,
  },
  written: {
    format: "written",
    label: "Written Answer",
    questionCount: SHORT_COUNT,
    hasMultipleChoice: false,
    hasWritten: true,
  },
  hybrid: {
    format: "hybrid",
    label: "Hybrid",
    questionCount: HYBRID_COUNT,
    hasMultipleChoice: true,
    hasWritten: true,
  },
  official: {
    format: "official",
    label: "Official",
    questionCount: OFFICIAL_COUNT,
    hasMultipleChoice: true,
    hasWritten: true,
  },
};

export const FORMAT_ORDER: AssessmentFormat[] = [
  "multiple_choice",
  "written",
  "hybrid",
  "official",
];

export function isAssessmentFormat(s: string): s is AssessmentFormat {
  return s === "multiple_choice" || s === "written" || s === "hybrid" || s === "official";
}

export interface SlotDef {
  slug: string;
  title: string;
  /** Grouping for the UI: when this diagnostic is meant to be taken. */
  phase: string;
  phaseLabel: string;
  order: number;
  /** Weeks the diagnostic covers. Empty for the pre-course aptitude check. */
  weeks: number[];
  /** True only for the pre-course aptitude diagnostic. */
  aptitude: boolean;
  description: string;
}

export const SLOTS: SlotDef[] = [
  {
    slug: "pre_course",
    title: "Pre-Course Aptitude Diagnostic",
    phase: "before",
    phaseLabel: "Before the course",
    order: 0,
    weeks: [],
    aptitude: true,
    description:
      "A baseline check of your quantitative-reasoning aptitude before week 1 — number sense, estimation, and reading quantitative claims.",
  },
  {
    slug: "week1",
    title: "Week 1 Diagnostic",
    phase: "after_week_1",
    phaseLabel: "After Week 1",
    order: 1,
    weeks: [1],
    aptitude: false,
    description: "Covers everything from Week 1.",
  },
  {
    slug: "week2_only",
    title: "Week 2 Diagnostic",
    phase: "after_week_2",
    phaseLabel: "After Week 2",
    order: 2,
    weeks: [2],
    aptitude: false,
    description: "Covers Week 2 only.",
  },
  {
    slug: "week1_2",
    title: "Weeks 1–2 Cumulative Diagnostic",
    phase: "after_week_2",
    phaseLabel: "After Week 2",
    order: 3,
    weeks: [1, 2],
    aptitude: false,
    description: "Cumulative — covers both Week 1 and Week 2.",
  },
  {
    slug: "week3",
    title: "Week 3 Diagnostic",
    phase: "after_week_3",
    phaseLabel: "After Week 3",
    order: 4,
    weeks: [3],
    aptitude: false,
    description: "Covers Week 3 only.",
  },
  {
    slug: "week4_only",
    title: "Week 4 Diagnostic",
    phase: "after_week_4",
    phaseLabel: "After Week 4",
    order: 5,
    weeks: [4],
    aptitude: false,
    description: "Covers Week 4 only.",
  },
  {
    slug: "week1_4",
    title: "Weeks 1–4 Final Cumulative Diagnostic",
    phase: "after_week_4",
    phaseLabel: "After Week 4",
    order: 6,
    weeks: [1, 2, 3, 4],
    aptitude: false,
    description: "Cumulative — covers the entire course, Weeks 1 through 4.",
  },
];

export const REQUIRED_SLOT_COUNT = SLOTS.length; // only the official format of each is required
export const DIAGNOSTIC_GRADE_WEIGHT = 0.2; // 20% of the course grade

export function getSlot(slug: string): SlotDef | undefined {
  return SLOTS.find((s) => s.slug === slug);
}

/**
 * How many of each question type to generate for a given format + slot.
 * Official slots are double-length and split between MC and written.
 */
export function questionPlan(format: AssessmentFormat): {
  multipleChoice: number;
  written: number;
} {
  const def = FORMATS[format];
  const total = def.questionCount;
  if (def.hasMultipleChoice && def.hasWritten) {
    const mc = Math.ceil(total / 2);
    return { multipleChoice: mc, written: total - mc };
  }
  if (def.hasMultipleChoice) return { multipleChoice: total, written: 0 };
  return { multipleChoice: 0, written: total };
}
