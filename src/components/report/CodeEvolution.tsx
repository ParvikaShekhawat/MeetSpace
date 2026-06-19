"use client";

import { msToTimestamp } from "@/lib/utils";
import { Code2 } from "lucide-react";

interface CodeEvent {
  id: string;
  timestampMs: number;
  payload: { code?: string; questionId?: string };
}

interface CodeEvolutionProps {
  events: CodeEvent[];
  finalCode: string | null;
  questionTitle?: string;
  questionRefId?: string;
  isInterviewer?: boolean;
}

export function CodeEvolution({ events, finalCode, questionTitle, questionRefId, isInterviewer }: CodeEvolutionProps) {
  const codeEvents = events
    .filter((e) => e.payload.code && (!questionRefId || e.payload.questionId === questionRefId))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (codeEvents.length === 0 && !finalCode) {
    return (
      <p className="text-sm text-slate-500">No code snapshots recorded for this interview.</p>
    );
  }

  const snapshots =
    codeEvents.length > 0
      ? [
          { label: "Initial Code", code: codeEvents[0].payload.code!, time: codeEvents[0].timestampMs },
          ...(codeEvents.length > 2
            ? [
                {
                  label: "Mid Snapshot",
                  code: codeEvents[Math.floor(codeEvents.length / 2)].payload.code!,
                  time: codeEvents[Math.floor(codeEvents.length / 2)].timestampMs,
                },
              ]
            : []),
          {
            label: "Final Code",
            code: finalCode || codeEvents[codeEvents.length - 1].payload.code!,
            time: codeEvents[codeEvents.length - 1]?.timestampMs ?? 0,
          },
        ]
      : [{ label: "Final Code", code: finalCode!, time: 0 }];

  return (
    <div className="space-y-4">
      {questionTitle && (
        <p className="text-sm font-medium text-slate-700">Question: {questionTitle}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {snapshots.map((snap) => (
          <div key={snap.label} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <Code2 className="h-4 w-4 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">{snap.label}</span>
              {snap.time > 0 && (
                <span className="ml-auto font-mono text-xs text-slate-400">
                  {msToTimestamp(snap.time)}
                </span>
              )}
            </div>
            <pre className="max-h-48 overflow-auto bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-400 custom-scrollbar">
              {snap.code}
            </pre>
          </div>
        ))}
      </div>
      
      {!isInterviewer && (
        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <h4 className="font-semibold text-brand-900 mb-2">Recommended Better Approach</h4>
          <p className="text-sm text-slate-700 leading-relaxed">
            Based on your final code, a more optimal approach would be to discuss and implement handling for edge cases early on. 
            Consider optimizing the time complexity by utilizing appropriate data structures (e.g., Hash Maps instead of nested loops) 
            and clearly separating the logic into helper functions to improve readability and maintainability.
          </p>
        </div>
      )}
    </div>
  );
}
