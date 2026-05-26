import { Delete } from "lucide-react";

interface NumberPadProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const KEYS: { label: string; insert?: string; action?: "back" | "clear"; wide?: boolean; muted?: boolean }[][] = [
  [
    { label: "7", insert: "7" },
    { label: "8", insert: "8" },
    { label: "9", insert: "9" },
    { label: "÷", insert: "/" },
    { label: "⌫", action: "back", muted: true },
  ],
  [
    { label: "4", insert: "4" },
    { label: "5", insert: "5" },
    { label: "6", insert: "6" },
    { label: "×", insert: "*" },
    { label: "C", action: "clear", muted: true },
  ],
  [
    { label: "1", insert: "1" },
    { label: "2", insert: "2" },
    { label: "3", insert: "3" },
    { label: "−", insert: "-" },
    { label: "(", insert: "(" },
  ],
  [
    { label: "0", insert: "0" },
    { label: ".", insert: "." },
    { label: ",", insert: "," },
    { label: "+", insert: "+" },
    { label: ")", insert: ")" },
  ],
  [
    { label: "%", insert: "%" },
    { label: "=", insert: "=" },
    { label: "space", insert: " ", wide: true },
  ],
];

export function NumberPad({ onInsert, onBackspace, onClear }: NumberPadProps) {
  return (
    <div className="bg-secondary/50 border rounded-md p-3 flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
        Number pad
      </div>
      {KEYS.map((row, ri) => (
        <div key={ri} className="grid grid-cols-5 gap-1.5">
          {row.map((k, ci) => (
            <button
              key={`${ri}-${ci}`}
              type="button"
              onClick={() => {
                if (k.action === "back") onBackspace();
                else if (k.action === "clear") onClear();
                else if (k.insert !== undefined) onInsert(k.insert);
              }}
              className={`h-10 rounded border shadow-sm flex items-center justify-center font-mono text-base hover:bg-muted hover:border-primary/50 transition-all active:scale-95 ${
                k.muted ? "bg-muted/40 text-muted-foreground" : "bg-background"
              } ${k.wide ? "col-span-3 text-sm" : ""}`}
              data-testid={`numpad-${k.label}`}
            >
              {k.action === "back" ? (
                <Delete className="w-4 h-4" />
              ) : (
                k.label
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
