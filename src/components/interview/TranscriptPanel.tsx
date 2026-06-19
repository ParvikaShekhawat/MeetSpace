"use client";

import { Mic, MicOff } from "lucide-react";

interface TranscriptPanelProps {
  entries: Array<{ id: string; timestampMs: number; text: string }>;
  listening: boolean;
  supported: boolean;
}

export function TranscriptPanel({ entries, listening, supported }: TranscriptPanelProps) {
  return (
    <div className="flex flex-col border-t border-slate-800/60">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Transcript</p>
        {supported ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            {listening ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3 text-slate-500" />}
            {listening ? "Recording" : "Paused"}
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">Speech API unavailable</span>
        )}
      </div>
      <div className="custom-scrollbar max-h-32 flex-1 overflow-y-auto px-3 pb-3">
        {entries.length === 0 ? (
          <p className="text-[11px] text-slate-600">Transcript will appear as you speak...</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(-8).map((entry) => (
              <div key={entry.id} className="rounded-lg bg-slate-900/60 px-2 py-1.5">
                <p className="font-mono text-[9px] text-sky-500">
                  {String(Math.floor(entry.timestampMs / 60000)).padStart(2, "0")}:
                  {String(Math.floor((entry.timestampMs / 1000) % 60)).padStart(2, "0")}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-300">{entry.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
