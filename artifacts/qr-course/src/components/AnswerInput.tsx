import React, { useRef, useState, useEffect, useCallback } from "react";
import { KeystrokeTrace } from "@workspace/api-client-react";
import { NumberPad } from "@/components/NumberPad";
import { Calculator } from "lucide-react";

interface AnswerInputProps {
  value: string;
  onChange: (val: string, trace: KeystrokeTrace) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AnswerInput({ value, onChange, placeholder, disabled }: AnswerInputProps) {
  const [sessionValue, setSessionValue] = useState(value);
  const [showNumPad, setShowNumPad] = useState<boolean>(() => {
    return localStorage.getItem("answer-numpad-open") === "1";
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const traceRef = useRef<KeystrokeTrace>({
    keystrokeCount: 0,
    eraseCount: 0,
    bulkInsertCount: 0,
    longestBulkInsertChars: 0,
    rewriteSegments: 0,
    durationMs: 0,
  });

  const sessionStartRef = useRef<number>(Date.now());
  const lastKeyWasEraseRef = useRef<boolean>(false);

  useEffect(() => {
    setSessionValue(value);
  }, [value]);

  useEffect(() => {
    localStorage.setItem("answer-numpad-open", showNumPad ? "1" : "0");
  }, [showNumPad]);

  const emitChange = useCallback(
    (newVal: string) => {
      const trace = {
        ...traceRef.current,
        durationMs: Date.now() - sessionStartRef.current,
      };
      onChange(newVal, trace);
    },
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const diff = newVal.length - sessionValue.length;

    if (diff > 5) {
      traceRef.current.bulkInsertCount = (traceRef.current.bulkInsertCount || 0) + 1;
      if (diff > (traceRef.current.longestBulkInsertChars || 0)) {
        traceRef.current.longestBulkInsertChars = diff;
      }
    }

    setSessionValue(newVal);
    emitChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isErase = e.key === "Backspace" || e.key === "Delete";

    if (isErase) {
      traceRef.current.eraseCount += 1;
      if (!lastKeyWasEraseRef.current) {
        traceRef.current.rewriteSegments = (traceRef.current.rewriteSegments || 0) + 1;
      }
      lastKeyWasEraseRef.current = true;
    } else if (e.key.length === 1 || e.key === "Enter") {
      traceRef.current.keystrokeCount += 1;
      lastKeyWasEraseRef.current = false;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => e.preventDefault();

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      const current = sessionValue;
      let next: string;
      let nextCaret: number;
      if (ta && document.activeElement === ta) {
        const start = ta.selectionStart ?? current.length;
        const end = ta.selectionEnd ?? current.length;
        next = current.slice(0, start) + text + current.slice(end);
        nextCaret = start + text.length;
      } else {
        next = current + text;
        nextCaret = next.length;
      }
      traceRef.current.keystrokeCount += text.length;
      setSessionValue(next);
      emitChange(next);
      requestAnimationFrame(() => {
        if (!ta) return;
        ta.focus();
        try {
          ta.setSelectionRange(nextCaret, nextCaret);
        } catch {}
      });
    },
    [sessionValue, emitChange],
  );

  const backspaceAtCursor = useCallback(() => {
    const ta = textareaRef.current;
    const current = sessionValue;
    let next: string;
    let nextCaret: number;
    if (ta && document.activeElement === ta) {
      const start = ta.selectionStart ?? current.length;
      const end = ta.selectionEnd ?? current.length;
      if (start === end) {
        if (start === 0) return;
        next = current.slice(0, start - 1) + current.slice(end);
        nextCaret = start - 1;
      } else {
        next = current.slice(0, start) + current.slice(end);
        nextCaret = start;
      }
    } else {
      if (current.length === 0) return;
      next = current.slice(0, -1);
      nextCaret = next.length;
    }
    traceRef.current.eraseCount += 1;
    if (!lastKeyWasEraseRef.current) {
      traceRef.current.rewriteSegments = (traceRef.current.rewriteSegments || 0) + 1;
    }
    lastKeyWasEraseRef.current = true;
    setSessionValue(next);
    emitChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      try {
        ta.setSelectionRange(nextCaret, nextCaret);
      } catch {}
    });
  }, [sessionValue, emitChange]);

  const clearAll = useCallback(() => {
    traceRef.current.eraseCount += sessionValue.length;
    setSessionValue("");
    emitChange("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [sessionValue.length, emitChange]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        ref={textareaRef}
        value={sessionValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        placeholder={placeholder || "Type your answer here..."}
        disabled={disabled}
        className="w-full min-h-[120px] p-4 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-y"
      />
      <div className="flex justify-between items-center px-1">
        <span className="text-xs text-muted-foreground">Pasting is disabled.</span>
        <button
          type="button"
          onClick={() => setShowNumPad((v) => !v)}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            showNumPad
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-border text-muted-foreground"
          }`}
          data-testid="toggle-numpad"
        >
          <Calculator className="w-3.5 h-3.5" />
          {showNumPad ? "Hide number pad" : "Show number pad"}
        </button>
      </div>
      {showNumPad && !disabled && (
        <NumberPad
          onInsert={insertAtCursor}
          onBackspace={backspaceAtCursor}
          onClear={clearAll}
        />
      )}
    </div>
  );
}
