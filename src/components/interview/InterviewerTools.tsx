"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Flag, Lightbulb, MessageSquare } from "lucide-react";

interface InterviewerToolsProps {
  onFlag: (flag: string) => void;
  onHint: () => void;
  onNote: (text: string) => void;
  hintText?: string | null;
}

const FLAGS = [
  { label: "Strong Answer", color: "hover:bg-emerald-600" },
  { label: "Good Insight", color: "hover:bg-sky-600" },
  { label: "Hint Needed", color: "hover:bg-amber-600" },
  { label: "Missed Edge Case", color: "hover:bg-red-600" },
  { label: "Optimization Found", color: "hover:bg-purple-600" },
  { label: "Communication Issue", color: "hover:bg-orange-600" },
];

export function InterviewerTools({ onFlag, onHint, onNote, hintText }: InterviewerToolsProps) {
  const [note, setNote] = useState("");
  const [overallNote, setOverallNote] = useState("");

  return (
    <div className="flex flex-col bg-white">
      <div className="border-b border-orange-100 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
          Quick Flags
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FLAGS.map(({ label, color }) => (
            <button
              key={label}
              onClick={() => onFlag(label)}
              className={`flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1.5 text-[10px] font-medium text-slate-700 transition-all duration-200 border border-orange-100/50 hover:text-white ${color} hover:shadow-sm active:scale-95`}
            >
              <Flag className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-orange-100 p-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100 hover:text-orange-800 shadow-sm"
          onClick={onHint}
          disabled={!hintText}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          Give Hint
        </Button>
      </div>

      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
          Timeline Note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add evidence at current timestamp..."
          className="mt-2 w-full resize-none rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm"
          rows={2}
        />
        <Button
          size="sm"
          className="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-white"
          onClick={() => {
            if (note.trim()) {
              onNote(note);
              setNote("");
            }
          }}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Add to Timeline
        </Button>
      </div>

      <div className="border-t border-orange-100 p-3 bg-orange-50/30">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
          Overall Private Notes
        </p>
        <textarea
          value={overallNote}
          onChange={(e) => setOverallNote(e.target.value)}
          onBlur={() => {
            if (overallNote.trim()) {
              // We'll save it as a special NOTE flag to be compiled later, or just keep it in state.
              // A simple way is to emit an EVENT with type "OVERALL_NOTE" or similar.
              // For now, we'll just save it as a NOTE on blur if it changed.
              // To avoid spamming, we could debounce, but onBlur is fine.
              onNote(`[PRIVATE NOTE UPDATE]: ${overallNote}`);
            }
          }}
          placeholder="Draft your final feedback here..."
          className="mt-2 w-full resize-none rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm"
          rows={4}
        />
        <p className="mt-1 text-[9px] text-slate-400 text-right">Auto-saves to timeline on blur</p>
      </div>
    </div>
  );
}
