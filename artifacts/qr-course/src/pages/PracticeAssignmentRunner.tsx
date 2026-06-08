import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetAssignment,
  useCreatePracticeAttempt,
  useSavePracticeAttemptAnswer,
  useSubmitPracticeAttempt,
  useSendPracticeAttemptMessage,
  type PracticeAttempt,
  type PracticeAttemptResult,
  type KeystrokeTrace,
  type PracticeMessage,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { LiveTutorPanel, TutorPanel, type TutorChatMsg } from "@/components/TutorPanel";
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Target,
  ShieldCheck,
} from "lucide-react";

const READINESS: Record<
  PracticeAttemptResult["readinessLabel"],
  { label: string; className: string }
> = {
  ready: { label: "Ready for the graded version", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  almost: { label: "Almost ready", className: "bg-amber-100 text-amber-900 border-amber-300" },
  not_ready: { label: "Keep practicing first", className: "bg-red-100 text-red-800 border-red-300" },
};

export default function PracticeAssignmentRunner() {
  const params = useParams();
  const assignmentId = Number(params.id);

  const { data: assignment } = useGetAssignment(assignmentId);
  const create = useCreatePracticeAttempt();
  const saveAnswer = useSavePracticeAttemptAnswer();
  const submit = useSubmitPracticeAttempt();

  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const tracesRef = useRef<Record<number, KeystrokeTrace>>({});
  const [result, setResult] = useState<PracticeAttemptResult | null>(null);

  function generate() {
    setAttempt(null);
    setAnswers({});
    tracesRef.current = {};
    setResult(null);
    create.mutate(
      { assignmentId, data: {} },
      { onSuccess: (a) => setAttempt(a) },
    );
  }

  // auto-generate the first practice attempt
  useEffect(() => {
    if (!Number.isNaN(assignmentId) && !attempt && !create.isPending && !result) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  function handleAnswerChange(problemId: number, val: string, trace: KeystrokeTrace) {
    setAnswers((prev) => ({ ...prev, [problemId]: val }));
    tracesRef.current[problemId] = trace;
    if (attempt) {
      saveAnswer.mutate({
        practiceAttemptId: attempt.id,
        data: { problemId, answer: val, trace },
      });
    }
  }

  async function handleSubmit() {
    if (!attempt || submit.isPending) return;
    // Flush the latest answers before grading so a fast typist + immediate
    // submit can never grade stale or in-flight data.
    try {
      await Promise.all(
        attempt.problems
          .filter((p) => (answers[p.id] ?? "").trim().length > 0)
          .map((p) =>
            saveAnswer.mutateAsync({
              practiceAttemptId: attempt.id,
              data: {
                problemId: p.id,
                answer: answers[p.id]!,
                trace: tracesRef.current[p.id],
              },
            }),
          ),
      );
    } catch {
      /* even if a save retry failed, fall through and grade what's stored */
    }
    try {
      const r = await submit.mutateAsync({ practiceAttemptId: attempt.id });
      setResult(r);
    } catch {
      /* submit error surfaced via submit.isError if needed */
    }
  }

  const answeredCount = attempt
    ? attempt.problems.filter((p) => (answers[p.id] ?? "").trim().length > 0).length
    : 0;

  return (
    <Layout>
      <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-2">
        <Link href="/assignments">
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to assignments
          </Button>
        </Link>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Practice mode · unlimited fresh versions · not graded
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-0 min-h-0">
        {/* LEFT: practice problems + feedback */}
        <div className="overflow-y-auto px-6 md:px-8 py-4 lg:border-r border-border">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-16">
            <header className="flex flex-col gap-1">
              <h1 className="text-2xl font-serif font-bold text-primary">
                Practice ·{" "}
                {assignment?.title ?? attempt?.sourceTitle ?? "Assignment"}
              </h1>
              <p className="text-sm text-muted-foreground">
                These are brand-new AI-generated problems modeled on the real assignment —
                you'll never see the exact graded questions here, and every practice run is
                unique. The live tutor on the right stays with you the whole time.
              </p>
            </header>

            {create.isPending || !attempt ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-muted-foreground italic">
                  Generating a fresh practice version…
                </div>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : result ? (
              <ResultView
                attempt={attempt}
                answers={answers}
                result={result}
                onGenerateAnother={generate}
                generating={create.isPending}
                assignmentId={assignmentId}
              />
            ) : (
              <>
                <div className="flex flex-col gap-8">
                  {attempt.problems.map((p, idx) => (
                    <div key={p.id} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          Problem {idx + 1}
                          <span className="ml-2 text-xs font-normal uppercase tracking-wider text-muted-foreground">
                            {p.topicTitle ?? ""}
                          </span>
                        </h3>
                      </div>
                      <div className="prose prose-slate max-w-none">
                        <MarkdownRenderer content={p.prompt} />
                      </div>
                      <AnswerInput
                        value={answers[p.id] || ""}
                        onChange={(val, trace) => handleAnswerChange(p.id, val, trace)}
                        promptSource={p.prompt}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t pt-4 sticky bottom-0 bg-background">
                  <div className="text-sm text-muted-foreground">
                    {answeredCount}/{attempt.problems.length} answered
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={generate}
                      disabled={create.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      New version
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submit.isPending || answeredCount === 0}
                    >
                      {submit.isPending ? "Grading…" : "Submit practice for feedback"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: persistent live tutor — stays on screen at every breakpoint */}
        <div className="flex flex-col min-h-[460px] lg:min-h-0 bg-secondary/20 border-t lg:border-t-0">
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5 text-sm font-semibold">
            <MessageSquare className="w-4 h-4 text-primary" />
            Live tutor
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              always on during practice
            </span>
          </div>
          <LiveTutorPanel emptyHint="The tutor is here for the whole practice run. Ask for a hint, a worked example, or help understanding a problem before you answer — it won't be available during the real graded assignment." />
        </div>
      </div>
    </Layout>
  );
}

/* ============ Result view: heavy feedback + focus pointers + readiness + dialogue ============ */
function ResultView({
  attempt,
  answers,
  result,
  onGenerateAnother,
  generating,
  assignmentId,
}: {
  attempt: PracticeAttempt;
  answers: Record<number, string>;
  result: PracticeAttemptResult;
  onGenerateAnother: () => void;
  generating: boolean;
  assignmentId: number;
}) {
  const readiness = READINESS[result.readinessLabel];

  return (
    <div className="flex flex-col gap-6">
      {/* Score + readiness */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-3xl font-serif font-bold text-primary">
              {result.percent}%
            </div>
            <div className="text-sm text-muted-foreground">
              {result.score} of {result.total} correct on this practice run
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${readiness.className}`}
          >
            <ShieldCheck className="w-4 h-4" />
            {readiness.label}
          </div>
        </div>
        <p className="text-sm text-foreground/80">{result.readinessSummary}</p>
        <div className="flex gap-2 pt-1">
          <Button onClick={onGenerateAnother} disabled={generating}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Generate another practice version
          </Button>
          <Link href={`/assignments/${assignmentId}`}>
            <Button variant="outline">Go to graded assignment</Button>
          </Link>
        </div>
      </div>

      {/* Focus pointers */}
      {result.focusPointers.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 font-semibold text-primary mb-3">
            <Target className="w-4 h-4" />
            What to focus on before the graded version
          </div>
          <ul className="flex flex-col gap-3">
            {result.focusPointers.map((fp, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary font-bold">→</span>
                <span>{fp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-problem heavy feedback */}
      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-serif font-semibold">Per-problem feedback</h2>
        {result.perProblem.map((pr, idx) => (
          <div
            key={pr.problemId}
            className={`rounded-lg border p-5 ${
              pr.correct ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-semibold mb-3 ${
                pr.correct ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {pr.correct ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Problem {idx + 1} · {pr.correct ? "Correct" : "Not quite"}
              {pr.topicTitle && (
                <span className="ml-1 text-xs font-normal uppercase tracking-wider text-muted-foreground">
                  {pr.topicTitle}
                </span>
              )}
            </div>

            <div className="text-sm prose prose-slate max-w-none mb-3">
              <MarkdownRenderer content={pr.prompt} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="rounded-md bg-background/70 border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Your answer
                </div>
                <div className="font-mono text-sm">{pr.userAnswer || "No answer"}</div>
              </div>
              <div className="rounded-md bg-background/70 border p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Correct answer
                </div>
                <div className="font-mono text-sm">{pr.correctAnswer}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Feedback on your work
              </div>
              <div className="text-sm prose prose-sm max-w-none">
                <MarkdownRenderer content={pr.feedback} />
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                Full worked solution
              </summary>
              <div className="mt-2 prose prose-sm max-w-none">
                <MarkdownRenderer content={pr.explanation} />
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Feedback dialogue */}
      <FeedbackDialogue practiceAttemptId={attempt.id} initial={attempt.messages} />
    </div>
  );
}

/* ============ Dialogue grounded in the graded practice result ============ */
function FeedbackDialogue({
  practiceAttemptId,
  initial,
}: {
  practiceAttemptId: number;
  initial: PracticeMessage[];
}) {
  const send = useSendPracticeAttemptMessage();
  const [history, setHistory] = useState<TutorChatMsg[]>(
    initial.map((m) => ({
      role: m.role === "user" ? "user" : "tutor",
      text: m.content,
    })),
  );

  function onSend(text: string) {
    setHistory((h) => [...h, { role: "user", text }]);
    send.mutate(
      { practiceAttemptId, data: { message: text } },
      {
        onSuccess: (res) => {
          setHistory((h) => [...h, { role: "tutor", text: res.text }]);
        },
        onError: (e) => {
          setHistory((h) => [
            ...h,
            { role: "tutor", text: `Tutor error: ${(e as Error).message}` },
          ]);
        },
      },
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold">
        <MessageSquare className="w-4 h-4 text-primary" />
        Talk through your feedback
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          grounded in this run's results
        </span>
      </div>
      <div className="h-[380px] flex flex-col">
        <TutorPanel
          history={history}
          pending={send.isPending}
          onSend={onSend}
          placeholder="Ask why you missed a problem, or how to avoid the mistake next time…"
          emptyHint="Ask the tutor about any problem you got wrong, why your approach didn't work, or how to fix the specific mistakes flagged above. It can see your answers and the correct ones."
        />
      </div>
    </div>
  );
}
