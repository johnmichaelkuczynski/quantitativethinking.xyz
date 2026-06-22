import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListAssessmentSlots,
  useGetAssessmentProgress,
  useStartAssessment,
  type AssessmentSlot,
  type AssessmentFormatStatus,
  type StartAssessmentInputFormat,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  CheckCircle2,
  Sparkles,
  Star,
  Wand2,
  Loader2,
} from "lucide-react";

const FORMAT_HELP: Record<string, string> = {
  multiple_choice: "Short · multiple choice only",
  written: "Short · written short-answer",
  hybrid: "Short · mix of multiple choice + written",
  official: "Required · full length · multiple choice + written",
};

export default function AssessmentsHub() {
  const [, setLocation] = useLocation();
  const { data: slots, isLoading } = useListAssessmentSlots();
  const { data: progress } = useGetAssessmentProgress();
  const start = useStartAssessment();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  function launch(
    key: string,
    body: {
      slug?: string;
      format: StartAssessmentInputFormat;
      isCustom?: boolean;
      scope?: string;
      weeks?: number[];
    },
  ) {
    if (start.isPending) return;
    setPendingKey(key);
    start.mutate(
      { data: body },
      {
        onSuccess: (attempt) => setLocation(`/assessments/attempts/${attempt.id}`),
        onSettled: () => setPendingKey(null),
      },
    );
  }

  const grouped = useMemo(() => {
    const byPhase = new Map<string, { label: string; order: number; slots: AssessmentSlot[] }>();
    for (const s of slots ?? []) {
      const g = byPhase.get(s.phase);
      if (g) g.slots.push(s);
      else byPhase.set(s.phase, { label: s.phaseLabel, order: s.order, slots: [s] });
    }
    return [...byPhase.values()]
      .sort((a, b) => Math.min(...a.slots.map((s) => s.order)) - Math.min(...b.slots.map((s) => s.order)))
      .map((g) => ({ ...g, slots: g.slots.sort((a, b) => a.order - b.order) }));
  }, [slots]);

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ClipboardCheck className="w-4 h-4" />
            Diagnostic Assessments
          </div>
          <h1 className="text-3xl font-serif font-bold text-primary">
            Check where you stand
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            These diagnostics aren't graded on your score — they're here to show you what
            you already know and what to study next. Every attempt is freshly generated, so
            you can retake any of them as many times as you like and never see the same
            questions twice. Completing the <span className="font-semibold">Official</span>{" "}
            version of each diagnostic earns full diagnostic credit.
          </p>
        </header>

        {/* Credit banner */}
        <CreditBanner progress={progress} />

        {/* Custom builder entry */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <div className="font-semibold">Build an assessment for your needs</div>
              <p className="text-sm text-muted-foreground max-w-xl">
                Describe exactly what you want to be tested on — pick the weeks and add any
                focus in your own words. We'll generate a custom diagnostic and track how you
                do.
              </p>
            </div>
          </div>
          <Button onClick={() => setCustomOpen(true)} className="shrink-0">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Create custom
          </Button>
        </div>

        {/* Slots grouped by phase */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.label} className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <div className="flex flex-col gap-4">
                {group.slots.map((slot) => (
                  <SlotCard
                    key={slot.slug}
                    slot={slot}
                    pendingKey={pendingKey}
                    onStart={(fmt) =>
                      launch(`${slot.slug}:${fmt}`, { slug: slot.slug, format: fmt })
                    }
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <CustomBuilderDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        pending={start.isPending && pendingKey === "custom"}
        onCreate={(scope, weeks, format) =>
          launch("custom", { isCustom: true, slug: "custom", scope, weeks, format })
        }
      />
    </Layout>
  );
}

function CreditBanner({
  progress,
}: {
  progress:
    | {
        officialCompleted: number;
        officialTotal: number;
        creditPercent: number;
        gradeWeight: number;
        totalAttempts: number;
        averageScorePercent: number | null;
      }
    | undefined;
}) {
  const pct = progress ? Math.round(progress.creditPercent) : 0;
  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 font-semibold">
          <Star className="w-4 h-4 text-amber-500" />
          Diagnostic credit
        </div>
        <div className="text-sm text-muted-foreground">
          Diagnostics are worth{" "}
          <span className="font-semibold text-foreground">
            {progress ? Math.round(progress.gradeWeight * 100) : 20}%
          </span>{" "}
          of your course grade
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-3xl font-serif font-bold text-primary">{pct}%</div>
        <div className="flex-1">
          <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-sm text-muted-foreground">
            {progress
              ? `${progress.officialCompleted} of ${progress.officialTotal} official diagnostics completed`
              : "—"}
            {progress && progress.totalAttempts > 0 && (
              <>
                {" · "}
                {progress.totalAttempts} total attempts
                {progress.averageScorePercent != null && (
                  <> · {Math.round(progress.averageScorePercent)}% avg (informational)</>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  pendingKey,
  onStart,
}: {
  slot: AssessmentSlot;
  pendingKey: string | null;
  onStart: (format: StartAssessmentInputFormat) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-semibold">{slot.title}</h3>
            {slot.officialCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Credit earned
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">{slot.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {slot.formats.map((fmt) => (
          <FormatButton
            key={fmt.format}
            fmt={fmt}
            pending={pendingKey === `${slot.slug}:${fmt.format}`}
            onStart={() => onStart(fmt.format as StartAssessmentInputFormat)}
          />
        ))}
      </div>
    </div>
  );
}

function FormatButton({
  fmt,
  pending,
  onStart,
}: {
  fmt: AssessmentFormatStatus;
  pending: boolean;
  onStart: () => void;
}) {
  const isOfficial = fmt.required;
  return (
    <button
      onClick={onStart}
      disabled={pending}
      className={`text-left rounded-md border p-3 transition-colors disabled:opacity-60 ${
        isOfficial
          ? "border-primary/50 bg-primary/5 hover:bg-primary/10"
          : "border-border hover:bg-secondary"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          {fmt.label}
          {isOfficial && <Star className="w-3.5 h-3.5 text-amber-500" />}
        </span>
        {fmt.completed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {FORMAT_HELP[fmt.format] ?? `${fmt.questionCount} questions`}
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">
        {pending ? (
          <span className="inline-flex items-center gap-1 text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            Generating…
          </span>
        ) : fmt.attemptCount > 0 ? (
          <>
            {fmt.attemptCount} {fmt.attemptCount === 1 ? "attempt" : "attempts"}
            {fmt.lastScorePercent != null && <> · last {Math.round(fmt.lastScorePercent)}%</>}
          </>
        ) : (
          "Not attempted yet"
        )}
      </div>
    </button>
  );
}

function CustomBuilderDialog({
  open,
  onOpenChange,
  pending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pending: boolean;
  onCreate: (scope: string, weeks: number[], format: StartAssessmentInputFormat) => void;
}) {
  const [scope, setScope] = useState("");
  const [weeks, setWeeks] = useState<number[]>([]);
  const [format, setFormat] = useState<StartAssessmentInputFormat>("hybrid");

  function toggleWeek(w: number) {
    setWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort()));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Build a custom assessment</DialogTitle>
          <DialogDescription>
            Pick the weeks to draw from and describe what you want to focus on. Every custom
            assessment is freshly generated and tracked in your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Weeks to cover</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  onClick={() => toggleWeek(w)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                    weeks.includes(w)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  Week {w}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Leave all unselected to draw from the whole course.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">
              What should this focus on?
            </label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. percentages and base rates, especially reading misleading statistics in the news"
              className="w-full min-h-[90px] rounded-md border border-border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["multiple_choice", "written", "hybrid", "official"] as StartAssessmentInputFormat[]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-md border text-sm font-medium text-left transition-colors ${
                    format === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {f === "multiple_choice"
                    ? "Multiple choice"
                    : f === "written"
                      ? "Written"
                      : f === "hybrid"
                        ? "Hybrid"
                        : "Official (full length)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate(scope.trim(), weeks, format)}
            disabled={pending || (scope.trim().length === 0 && weeks.length === 0)}
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate assessment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
