import React from "react";
import {
  useListAssignments,
  useListPracticeAttempts,
  type AssignmentSummary,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";

function AssignmentCard({ item }: { item: AssignmentSummary }) {
  const { data: practice } = useListPracticeAttempts(item.id);
  const practiceCount = practice?.length ?? 0;
  const submittedPractice = (practice ?? []).filter((p) => p.status === "submitted").length;
  const bestPractice = (practice ?? []).reduce<number | null>((best, p) => {
    if (p.scorePercent == null) return best;
    return best == null ? p.scorePercent : Math.max(best, p.scorePercent);
  }, null);
  const isGraded = item.status === "submitted";
  const coldStart = !isGraded && submittedPractice === 0;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {item.kind}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.status === "submitted"
                ? "bg-primary/10 text-primary"
                : item.status === "in_progress"
                  ? "bg-chart-4/20 text-chart-4"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {item.status.replace("_", " ")}
          </span>
        </div>
        <CardTitle className="text-lg">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
          <span>{item.problemCount} problems</span>
          {item.isTimed && <span>⏱️ {item.timeLimitMinutes} min</span>}
          {item.bestScore !== undefined && item.bestScore !== null && (
            <span className="font-semibold text-foreground">Score: {item.bestScore}%</span>
          )}
        </div>

        {/* Practice status line */}
        <div className="text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {practiceCount === 0 ? (
            <span className="text-muted-foreground">No practice runs yet</span>
          ) : (
            <span className="text-muted-foreground">
              {practiceCount} practice run{practiceCount === 1 ? "" : "s"}
              {bestPractice != null && (
                <> · best {bestPractice}%</>
              )}
            </span>
          )}
        </div>

        {/* Cold-start encouragement before graded work */}
        {coldStart && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              You haven't practiced this yet. The graded attempt counts — run a free
              practice version first to see where you stand.
            </span>
          </div>
        )}
        {!isGraded && submittedPractice > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              You've practiced {submittedPractice} time{submittedPractice === 1 ? "" : "s"}.
              Keep going until you're consistently scoring well, then take the graded version.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Link href={`/assignments/${item.id}/practice`}>
            <Button className="w-full" variant={isGraded ? "default" : "default"}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              {practiceCount === 0 ? "Practice this (free, unlimited)" : "Practice again"}
            </Button>
          </Link>
          <Link href={`/assignments/${item.id}`}>
            <Button
              className="w-full"
              variant="outline"
            >
              {item.status === "submitted"
                ? "Review graded results"
                : item.status === "in_progress"
                  ? "Resume graded attempt"
                  : "Take graded version"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Assignments() {
  const { data: assignments, isLoading } = useListAssignments();

  // Group by week
  const grouped = assignments?.reduce((acc, a) => {
    if (!acc[a.weekNumber]) acc[a.weekNumber] = [];
    acc[a.weekNumber].push(a);
    return acc;
  }, {} as Record<number, typeof assignments>);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Assignments</h1>
          <p className="text-muted-foreground">Complete your homework, tests, midterm, and final exams.</p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold text-primary">Practice before you're graded.</div>
            <p className="text-foreground/80">
              Every assignment has unlimited, free practice versions — brand-new AI-generated
              problems that never reuse the graded questions. You get heavy per-problem feedback,
              a tutor to talk it through, and a focused list of what to work on. The live tutor
              stays on screen the whole time you practice; it's only hidden during the real graded
              attempt.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(grouped || {}).map(([week, items]) => (
              <div key={week} className="flex flex-col gap-4">
                <h2 className="text-2xl font-serif font-semibold border-b pb-2">Week {week}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <AssignmentCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
