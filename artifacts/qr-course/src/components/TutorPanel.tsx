import { useEffect, useRef, useState } from "react";
import { useAskTutor } from "@workspace/api-client-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export type TutorChatMsg = { role: "user" | "tutor"; text: string };

/* ============ Presentational, input-first tutor panel ============ */
export function TutorPanel({
  history,
  pending,
  onSend,
  placeholder = "Ask anything… (Shift+Enter for newline)",
  emptyHint = "Start a real conversation with the tutor — ask for an explanation, a worked example, or a hint. Follow up as much as you want.",
  disabled = false,
}: {
  history: TutorChatMsg[];
  pending: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
  emptyHint?: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [history.length, pending]);

  function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    onSend(msg);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Input first — conversation-led, no canned starter chips */}
      <div className="border-b border-border bg-background p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          rows={3}
          disabled={disabled}
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[76px] max-h-[280px] disabled:opacity-50"
          data-testid="input-tutor-question"
        />
        <Button size="lg" onClick={send} disabled={disabled || !input.trim() || pending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {history.length === 0 && (
          <div className="m-auto text-center text-sm text-muted-foreground italic max-w-sm">
            {emptyHint}
          </div>
        )}

        {history.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] ${m.role === "user" ? "self-end" : "self-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              <MarkdownRenderer content={m.text} inverted={m.role === "user"} />
            </div>
          </div>
        ))}
        {pending && (
          <div className="self-start px-3 py-2 rounded-lg bg-card border border-border text-sm animate-pulse text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Smart live-tutor panel backed by the lecture/topic tutor ============ */
export function LiveTutorPanel({
  lectureId = null,
  topicId = null,
  selectedText = "",
  placeholder,
  emptyHint,
}: {
  lectureId?: number | null;
  topicId?: number | null;
  selectedText?: string;
  placeholder?: string;
  emptyHint?: string;
}) {
  const [history, setHistory] = useState<TutorChatMsg[]>([]);
  const ask = useAskTutor();

  function onSend(text: string) {
    setHistory((h) => [...h, { role: "user", text }]);
    ask.mutate(
      {
        data: {
          message: text,
          lectureId: lectureId ?? undefined,
          topicId: topicId ?? undefined,
          selectedLectureText: selectedText || undefined,
        },
      },
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
    <TutorPanel
      history={history}
      pending={ask.isPending}
      onSend={onSend}
      placeholder={
        placeholder ??
        (selectedText
          ? "Ask about the highlighted passage…"
          : "Ask anything about this material… (Shift+Enter for newline)")
      }
      emptyHint={emptyHint}
    />
  );
}
