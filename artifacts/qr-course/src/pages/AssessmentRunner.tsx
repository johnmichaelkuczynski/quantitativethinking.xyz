import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetAssessmentAttempt,
  useSaveAssessmentAnswer,
  useSubmitAssessment,
  useStartAssessment,
  type AssessmentAttempt,
  type AssessmentQuestion,
  type KeystrokeTrace,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Target,
  Sparkles,
  Loader2,
  Star,
} from "lucide-react";

const FORMAT_LABEL: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  written: "Written",
  hybrid: "Hybrid",
  official: "Official",
};

export default function AssessmentRunner() {
  const params = useParams();
  const attemptId = Number(params.id);
  const [, setLocation] = useLocation();

  const { data: attempt, isLoading } = useGetAssessmentAttempt(attemptId);
  const saveAnswer = useSaveAssessmentAnswer();
  const submit = useSubmitAssessment();
  const start = useStartAssessment();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const tracesRef = useRef<Record<number, KeystrokeTrace>>({});
  const [hydrated, setHydrated] = useState(false);

  const submitted = attempt?.status === "submitted";

  // Hydrate local answer state from saved answers once.
  useEffect(() => {
    if (attempt && !hydrated) {
      const initial: Record<number, string> = {};
      for (const q of attempt.questions) {
        if (q.yourAnswer) initial[q.id] = q.yourAnswer;
      }
      setAnswers(initial);
      setHydrated(true);
    }
  }, [attempt, hydrated]);

  function setChoice(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saveAnswer.mutate({ attemptId, data: { questionId, answer: value } });
  }

  function setWritten(questionId: number, value: string, trace: KeystrokeTrace) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    tracesRef.current[questionId] = trace;
    saveAnswer.mutate({
      attemptId,
      data: { questionId, answer: value, trace: trace as unknown as Record<string, unknown> },
    });
  }

  async function handleSubmit() {
    if (!attempt || submit.isPending) return;
    try {
      await Promise.all(
        attempt.questions
          .filter((q) => (answers[q.id] ?? "").trim().length > 0)
          .map((q) =>
            saveAnswer.mutateAsync({
              attemptId,
              data: {
                questionId: q.id,
                answer: answers[q.id]!,
                trace: tracesRef.current[q.id] as unknown as Record<string, unknown> | undefined,
              },
            }),
          ),
      );
    } catch {
      /* grade what's stored even if a save retry failed */
    }
    try {
      await submit.mutateAsync({ attemptId });
    } catch {
      /* error surfaced via submit.isError */
    }
  }

  function retake() {
    if (!attempt || start.isPending) return;
    start.mutate(
      {
        data: {
          slug: attempt.slug,
          format: attempt.format,
          isCustom: attempt.isCustom,
          scope: attempt.scope ?? undefined,
          weeks: attempt.weeks,
        },
      },
      { onSuccess: (a) => setLocation(`/assessments/attempts/${a.id}`) },
    );
  }

  if (isLoading || !attempt) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  const answeredCount = attempt.questions.filter(
    (q) => (answers[q.id] ?? "").trim().length > 0,
  ).length;

  return (
    <Layout>
      <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-2">
        <Link href="/assessments">
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to assessments
          </Button>
        </Link>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Diagnostic · not graded on score · freshly generated
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-16">
          <header className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif font-bold text-primary">{attempt.title}</h1>
              {attempt.format === "official" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5" />
                  Required for credit
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {FORMAT_LABEL[attempt.format]} format · {attempt.questions.length} questions
              {attempt.scope ? ` · focus: ${attempt.scope}` : ""}
            </p>
          </header>

          {submitted && <ResultSummary attempt={attempt} onRetake={retake} retaking={start.isPending} />}

          <div className="flex flex-col gap-8">
            {attempt.questions.map((q, idx) => (
              <QuestionBlock
                key={q.id}
                question={q}
                index={idx}
                value={answers[q.id] ?? ""}
                submitted={submitted}
                onChoice={(v) => setChoice(q.id, v)}
                onWritten={(v, t) => setWritten(q.id, v, t)}
              />
            ))}
          </div>

          {!submitted && (
            <div className="flex items-center justify-between border-t pt-4 sticky bottom-0 bg-background">
              <div className="text-sm text-muted-foreground">
                {answeredCount}/{attempt.questions.length} answered
              </div>
              <Button onClick={handleSubmit} disabled={submit.isPending || answeredCount === 0}>
                {submit.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Grading…
                  </>
                ) : (
                  "Submit assessment"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ResultSummary({
  attempt,
  onRetake,
  retaking,
}: {
  attempt: AssessmentAttempt;
  onRetake: () => void;
  retaking: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          <div>
            <div className="font-serif font-bold text-lg">Diagnostic complete — full credit earned</div>
            <div className="text-sm text-muted-foreground">
              You answered {attempt.scorePercent != null ? Math.round(attempt.scorePercent) : 0}%
              correctly. The score is informational only — it doesn't affect your grade.
            </div>
          </div>
        </div>
        <Button onClick={onRetake} disabled={retaking} variant="outline">
          {retaking ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retake (new questions)
            </>
          )}
        </Button>
      </div>

      {attempt.summary && (
        <p className="text-sm text-foreground/80 border-t pt-3">{attempt.summary}</p>
      )}

      {attempt.focusPointers && attempt.focusPointers.length > 0 && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 font-semibold text-primary mb-2">
            <Target className="w-4 h-4" />
            What to focus on next
          </div>
          <ul className="flex flex-col gap-2">
            {attempt.focusPointers.map((fp, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary font-bold">→</span>
                <span>{fp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuestionBlock({
  question,
  index,
  value,
  submitted,
  onChoice,
  onWritten,
}: {
  question: AssessmentQuestion;
  index: number;
  value: string;
  submitted: boolean;
  onChoice: (v: string) => void;
  onWritten: (v: string, trace: KeystrokeTrace) => void;
}) {
  const correct = question.correct === true;
  const borderClass = submitted
    ? correct
      ? "border-emerald-300 bg-emerald-50"
      : "border-red-300 bg-red-50"
    : "border-border bg-card";

  return (
    <div className={`rounded-lg border p-5 flex flex-col gap-3 ${borderClass}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          Question {index + 1}
          <span className="text-xs font-normal uppercase tracking-wider text-muted-foreground">
            {question.type === "multiple_choice" ? "Multiple choice" : "Written"}
            {question.topicTitle ? ` · ${question.topicTitle}` : ""}
          </span>
        </h3>
        {submitted && (
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold ${
              correct ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {correct ? "Correct" : "Not quite"}
          </span>
        )}
      </div>

      <div className="prose prose-slate max-w-none">
        <MarkdownRenderer content={question.prompt} />
      </div>

      {question.type === "multiple_choice" ? (
        <div className="flex flex-col gap-2">
          {(question.choices ?? []).map((choice) => {
            const selected = value === choice;
            const isCorrectChoice =
              submitted && question.correctAnswer != null && choice === question.correctAnswer;
            return (
              <label
                key={choice}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  isCorrectChoice
                    ? "border-emerald-400 bg-emerald-100/60"
                    : selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary"
                } ${submitted ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="mt-1"
                  checked={selected}
                  disabled={submitted}
                  onChange={() => onChoice(choice)}
                />
                <span className="text-sm">{choice}</span>
              </label>
            );
          })}
        </div>
      ) : submitted ? (
        <div className="rounded-md bg-background/70 border p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Your answer
          </div>
          <div className="text-sm whitespace-pre-wrap">{value || "No answer"}</div>
        </div>
      ) : (
        <AnswerInput
          value={value}
          onChange={(v, trace) => onWritten(v, trace)}
          promptSource={question.prompt}
        />
      )}

      {submitted && (
        <div className="flex flex-col gap-3 border-t pt-3">
          {question.correctAnswer != null && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Correct answer
              </div>
              <div className="font-mono text-sm">{question.correctAnswer}</div>
            </div>
          )}
          {question.feedback && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Feedback
              </div>
              <div className="text-sm prose prose-sm max-w-none">
                <MarkdownRenderer content={question.feedback} />
              </div>
            </div>
          )}
          {question.explanation && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                Full worked solution
              </summary>
              <div className="mt-2 prose prose-sm max-w-none">
                <MarkdownRenderer content={question.explanation} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
