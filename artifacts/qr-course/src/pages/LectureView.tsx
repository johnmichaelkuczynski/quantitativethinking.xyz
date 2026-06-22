import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetLecture,
  useStartPracticeSession,
  useNextPracticeProblem,
  useGradePracticeAnswer,
  type PracticeProblem,
  type PracticeGrade,
  type KeystrokeTrace,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AnswerInput } from "@/components/AnswerInput";
import { LiveTutorPanel } from "@/components/TutorPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Sparkles, X, RefreshCw, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";

function LectureNav({ id, dir }: { id: number | null | undefined; dir: "prev" | "next" }) {
  const label = dir === "prev" ? "Previous lecture" : "Next lecture";
  const inner =
    dir === "prev" ? (
      <>
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </>
    ) : (
      <>
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </>
    );
  if (id == null) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        aria-label={`${label} (none)`}
        className="opacity-40"
      >
        {inner}
      </Button>
    );
  }
  return (
    <Link href={`/lectures/${id}`}>
      <Button variant="outline" size="sm" aria-label={label} title={label} data-testid={`button-lecture-${dir}`}>
        {inner}
      </Button>
    </Link>
  );
}

export default function LectureView() {
  const params = useParams();
  const lectureId = Number(params.lectureId);
  const { data: lecture, isLoading, refetch } = useGetLecture(lectureId);

  // shared selected-text state (used by both Tutor and Practice)
  const [selectedText, setSelectedText] = useState("");
  const articleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onSelect() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;
      // only capture selections that are inside the article
      if (!articleRef.current) return;
      const anchor = sel.anchorNode;
      if (anchor && articleRef.current.contains(anchor)) {
        setSelectedText(text.slice(0, 800));
      }
    }
    document.addEventListener("mouseup", onSelect);
    document.addEventListener("keyup", onSelect);
    return () => {
      document.removeEventListener("mouseup", onSelect);
      document.removeEventListener("keyup", onSelect);
    };
  }, []);

  const [tab, setTab] = useState<"tutor" | "practice">("tutor");
  const [level, setLevel] = useState<"short" | "medium" | "long">("short");

  const availableLevels = useMemo(() => {
    const out: Array<"short" | "medium" | "long"> = ["short"];
    if (lecture?.bodyMedium) out.push("medium");
    if (lecture?.bodyLong) out.push("long");
    return out;
  }, [lecture?.bodyMedium, lecture?.bodyLong]);

  const activeBody =
    level === "long" && lecture?.bodyLong
      ? lecture.bodyLong
      : level === "medium" && lecture?.bodyMedium
        ? lecture.bodyMedium
        : (lecture?.body ?? "");

  const [generating, setGenerating] = useState<null | "medium" | "long">(null);
  const [genError, setGenError] = useState<string | null>(null);
  const leftScrollRef = useRef<HTMLDivElement | null>(null);

  // When navigating to a different lecture, reset depth + errors and scroll to top.
  useEffect(() => {
    setLevel("short");
    setGenError(null);
    setSelectedText("");
    leftScrollRef.current?.scrollTo({ top: 0 });
  }, [lectureId]);

  async function generateLevel(lvl: "medium" | "long") {
    if (!lecture || generating) return;
    setGenError(null);
    setGenerating(lvl);
    try {
      const res = await fetch(
        `/api/diagnostics/expand-lectures?level=${lvl}&id=${lecture.id}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { updated?: number };
      if ((data.updated ?? 0) < 1)
        throw new Error("Couldn't generate a longer version — please try again.");
      await refetch();
      setLevel(lvl);
    } catch (e) {
      setGenError((e as Error).message);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <Layout>
      <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-2">
        <Link href={lecture ? `/weeks/${lecture.weekNumber}` : "/"}>
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Week {lecture?.weekNumber ?? ""}
          </Button>
        </Link>
        {lecture && (lecture.prevLectureId != null || lecture.nextLectureId != null) && (
          <div className="flex items-center gap-2">
            <LectureNav id={lecture.prevLectureId} dir="prev" />
            <LectureNav id={lecture.nextLectureId} dir="next" />
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* LEFT: lecture */}
        <div ref={leftScrollRef} className="overflow-y-auto px-8 pb-16 border-r border-border">
          {isLoading ? (
            <div className="flex flex-col gap-6 mt-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : lecture ? (
            <article>
              <header className="mb-6 mt-2">
                <h1 className="text-3xl font-serif font-bold text-primary mb-3 leading-tight">
                  {lecture.title}
                </h1>
                <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider sm:pt-1.5">
                    Week {lecture.weekNumber}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                      {(["short", "medium", "long"] as const).map((lvl) => {
                        const isReady = availableLevels.includes(lvl);
                        const active = level === lvl;
                        const isGenerating = generating === lvl;
                        const canGenerate = !isReady && lvl !== "short";
                        return (
                          <button
                            key={lvl}
                            onClick={() => {
                              if (isReady) setLevel(lvl);
                              else if (canGenerate) generateLevel(lvl);
                            }}
                            disabled={generating !== null}
                            title={
                              isReady
                                ? `${lvl[0].toUpperCase() + lvl.slice(1)} version`
                                : `Generate the ${lvl} version of this lecture now`
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1.5 font-medium uppercase tracking-wider transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : isReady
                                  ? "bg-background hover:bg-secondary text-foreground"
                                  : "bg-background text-primary hover:bg-secondary"
                            } ${generating !== null ? "cursor-wait opacity-70" : ""}`}
                            data-testid={`button-level-${lvl}`}
                          >
                            {isGenerating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : canGenerate ? (
                              <Sparkles className="w-3 h-3" />
                            ) : null}
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] leading-snug text-muted-foreground max-w-[220px] text-right">
                      {generating ? (
                        `Generating the ${generating} version of this lecture…`
                      ) : genError ? (
                        <span className="text-red-600">{genError}</span>
                      ) : (
                        "Medium & long are generated on demand for this lecture only."
                      )}
                    </div>
                  </div>
                </div>
              </header>
              <div className="bg-card border shadow-sm rounded-lg p-6 md:p-8" ref={articleRef}>
                <MarkdownRenderer content={activeBody} />
                <div className="mt-6 pt-4 border-t border-dashed border-border text-xs text-muted-foreground italic">
                  Tip: highlight any passage above to ask the tutor about it, or to generate practice problems specifically on what you selected.
                </div>
              </div>
              {(lecture.prevLectureId != null || lecture.nextLectureId != null) && (
                <div className="mt-6 flex items-center justify-between gap-2">
                  <LectureNav id={lecture.prevLectureId} dir="prev" />
                  <LectureNav id={lecture.nextLectureId} dir="next" />
                </div>
              )}
            </article>
          ) : (
            <div className="mt-8">Lecture not found.</div>
          )}
        </div>

        {/* RIGHT: practice + tutor */}
        <div className="flex flex-col min-h-0 bg-secondary/20">
          <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("tutor")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                  tab === "tutor" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
                data-testid="tab-tutor"
              >
                <MessageSquare className="w-4 h-4" />
                Ask the tutor
              </button>
              <button
                onClick={() => setTab("practice")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                  tab === "practice" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
                data-testid="tab-practice"
              >
                <Sparkles className="w-4 h-4" />
                Practice on this
              </button>
            </div>
            {selectedText && (
              <button
                onClick={() => setSelectedText("")}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> clear selection
              </button>
            )}
          </div>

          {selectedText && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
              <div className="font-semibold mb-0.5">Using your highlighted text:</div>
              <div className="line-clamp-2 italic">"{selectedText}"</div>
            </div>
          )}

          {tab === "tutor" ? (
            <LiveTutorPanel
              lectureId={lecture?.id ?? null}
              topicId={lecture?.topicId ?? null}
              selectedText={selectedText}
            />
          ) : (
            <PracticePane
              lectureId={lecture?.id ?? null}
              topicId={lecture?.topicId ?? null}
              weekNumber={lecture?.weekNumber ?? null}
              selectedText={selectedText}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ============ Practice pane (inline, scoped to this lecture's topic) ============ */
function PracticePane({
  lectureId,
  topicId,
  weekNumber,
  selectedText,
}: {
  lectureId: number | null;
  topicId: number | null;
  weekNumber: number | null;
  selectedText: string;
}) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [trace, setTrace] = useState<KeystrokeTrace>({
    keystrokeCount: 0,
    eraseCount: 0,
    durationMs: 0,
  });

  const start = useStartPracticeSession();
  const next = useNextPracticeProblem();
  const grader = useGradePracticeAnswer();

  // auto-start a session scoped to this lecture's topic
  useEffect(() => {
    if (sessionId != null || topicId == null) return;
    start.mutate(
      {
        data: {
          tutorEnabled: true,
          focusOnWeaknesses: false,
          topicId,
          weekNumber: weekNumber ?? undefined,
        },
      },
      {
        onSuccess: (s) => {
          setSessionId(s.id);
          loadNext(s.id);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const requestText = useMemo(() => {
    return selectedText
      ? `Make a problem that drills exactly this passage from the lecture:\n"""${selectedText}"""`
      : "";
  }, [selectedText]);

  function loadNext(sid: number) {
    setAnswer("");
    setGrade(null);
    setTrace({ keystrokeCount: 0, eraseCount: 0, durationMs: 0 });
    setProblem(null);
    next.mutate(
      {
        sessionId: sid,
        data: { topicId: topicId ?? undefined, request: requestText || undefined },
      },
      { onSuccess: (p) => setProblem(p) },
    );
  }

  function submit() {
    if (!sessionId || !problem) return;
    grader.mutate(
      { sessionId, data: { problemId: problem.id, answer, trace } },
      { onSuccess: (r) => setGrade(r) },
    );
  }

  if (topicId == null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
        Loading lecture…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Practice · {problem?.topicTitle ?? "this lecture"}
            {problem?.difficulty != null && (
              <span className="ml-2 normal-case font-normal">
                · difficulty {problem.difficulty.toFixed(1)}/5
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => sessionId && loadNext(sessionId)}
            disabled={next.isPending || grader.isPending}
            data-testid="button-new-problem"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            New problem
          </Button>
        </div>

        {selectedText && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2">
            The next problem you generate will be drilled specifically on the passage you highlighted. Click <strong>New problem</strong> to regenerate.
          </div>
        )}

        <div className="bg-card border rounded-lg p-4 min-h-[120px]">
          {next.isPending || !problem ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <MarkdownRenderer content={problem.prompt} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <AnswerInput
            value={answer}
            onChange={(val, t) => {
              setAnswer(val);
              setTrace(t);
            }}
            disabled={!!grade || !problem}
            promptSource={problem?.prompt}
          />
        </div>

        {grade ? (
          <div
            className={`rounded-md border p-3 ${
              grade.correct
                ? "bg-emerald-50 border-emerald-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-semibold mb-2 ${
                grade.correct ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {grade.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {grade.correct ? "Correct" : "Not quite"}
            </div>
            <div className="text-sm prose prose-sm max-w-none">
              <MarkdownRenderer content={grade.explanation} />
            </div>
            {grade.tutorTip && (
              <div className="mt-2 pt-2 border-t border-border/60 text-sm italic text-muted-foreground">
                Tutor tip: {grade.tutorTip}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => sessionId && loadNext(sessionId)}
                disabled={next.isPending}
                data-testid="button-next-after-grade"
              >
                Next problem
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={!answer.trim() || grader.isPending || !problem}
              data-testid="button-submit-practice"
            >
              {grader.isPending ? "Grading…" : "Submit answer"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
