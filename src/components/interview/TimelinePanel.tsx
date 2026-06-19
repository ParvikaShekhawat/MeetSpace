"use client";

import { cn, msToTimestamp } from "@/lib/utils";
import {
  Flag,
  Lightbulb,
  MessageSquare,
  Code2,
  PlayCircle,
  StopCircle,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  timestampMs: number;
  type: string;
  payload: Record<string, string | undefined>;
}

interface TimelinePanelProps {
  events: TimelineEvent[];
  activeEventId?: string | null;
  onSelect?: (event: TimelineEvent) => void;
  compact?: boolean;
}

const eventIcons: Record<string, typeof Flag> = {
  FLAG: Flag,
  HINT: Lightbulb,
  NOTE: MessageSquare,
  CODE_CHANGE: Code2,
  INTERVIEW_STARTED: PlayCircle,
  INTERVIEW_ENDED: StopCircle,
  QUESTION_STARTED: PlayCircle,
  TRANSCRIPT: MessageSquare,
};

const eventColors: Record<string, string> = {
  FLAG: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  HINT: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  NOTE: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  CODE_CHANGE: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  INTERVIEW_STARTED: "text-brand-400 bg-brand-400/10 border-brand-400/20",
  INTERVIEW_ENDED: "text-red-400 bg-red-400/10 border-red-400/20",
  QUESTION_STARTED: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  TRANSCRIPT: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
};

export function TimelinePanel({
  events,
  activeEventId,
  onSelect,
  compact = false,
}: TimelinePanelProps) {
  if (events.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-xs text-slate-500">
        Events will appear as the interview progresses
      </p>
    );
  }

  return (
    <div className={cn("space-y-1 custom-scrollbar overflow-y-auto", compact ? "max-h-48" : "max-h-64")}>
      {events.map((e) => {
        const Icon = eventIcons[e.type] ?? MessageSquare;
        const color = eventColors[e.type] ?? "text-slate-400 bg-slate-400/10 border-slate-400/20";
        const isActive = activeEventId === e.id;

        return (
          <button
            key={e.id}
            onClick={() => onSelect?.(e)}
            className={cn(
              "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-200",
              color,
              isActive && "ring-2 ring-brand-500/50 scale-[1.02]",
              onSelect && "cursor-pointer hover:brightness-125"
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold opacity-80">
                  {msToTimestamp(e.timestampMs)}
                </span>
                <span className="truncate text-[11px] font-medium">
                  {e.type.replace(/_/g, " ")}
                </span>
              </div>
              {(e.payload.text || e.payload.flag || e.payload.title) && (
                <p className="mt-0.5 truncate text-[10px] opacity-70">
                  {e.payload.flag || e.payload.title || e.payload.text}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
