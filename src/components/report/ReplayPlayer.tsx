"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { msToTimestamp } from "@/lib/utils";
import { TimelinePanel } from "@/components/interview/TimelinePanel";
import { Play, Pause, SkipBack, SkipForward, Code2 } from "lucide-react";

interface ReplayEvent {
  id: string;
  timestampMs: number;
  type: string;
  payload: Record<string, string | undefined>;
}

interface ReplayQuestion {
  title: string;
  finalCode: string | null;
}

interface ReplayPlayerProps {
  events: ReplayEvent[];
  questions: ReplayQuestion[];
  durationMins: number;
  candidateName: string;
}

export function ReplayPlayer({
  events,
  questions,
  durationMins,
  candidateName,
}: ReplayPlayerProps) {
  const maxMs = durationMins * 60 * 1000;
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const activeEvent = events.find((e) => e.id === activeEventId) ?? null;

  const codeAtTime = useMemo(() => {
    const codeEvents = events
      .filter((e) => e.type === "CODE_CHANGE" && e.timestampMs <= currentMs)
      .sort((a, b) => b.timestampMs - a.timestampMs);
    return codeEvents[0]?.payload.code ?? questions[0]?.finalCode ?? "// No code at this timestamp";
  }, [currentMs, events, questions]);

  const visibleEvents = events.filter((e) => e.timestampMs <= currentMs);

  function seekTo(ms: number) {
    setCurrentMs(Math.max(0, Math.min(maxMs, ms)));
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentMs((prev) => {
        const next = prev + 1000;
        if (next >= maxMs) {
          setPlaying(false);
          return maxMs;
        }
        const active = [...events]
          .filter((e) => e.timestampMs <= next)
          .sort((a, b) => b.timestampMs - a.timestampMs)[0];
        if (active) setActiveEventId(active.id);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, maxMs, events]);

  function selectEvent(event: ReplayEvent) {
    setActiveEventId(event.id);
    seekTo(event.timestampMs);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      {/* Compact Header & Scrubber */}
      <div className="relative bg-gradient-to-br from-slate-900 to-brand-950 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Interview Replay: <span className="text-white">{candidateName}</span></p>
          </div>
          <p className="font-mono text-xl font-bold text-sky-400">
            {msToTimestamp(currentMs)}
          </p>
        </div>

        {/* Scrubber */}
        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={maxMs}
            value={currentMs}
            onChange={(e) => seekTo(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-brand-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>00:00</span>
            <span>{msToTimestamp(maxMs)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => seekTo(currentMs - 30000)}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="rounded-full bg-brand-600 p-3 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={() => seekTo(currentMs + 30000)}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Synced panels */}
      <div className="grid gap-0 lg:grid-cols-3">
        {/* Timeline */}
        <div className="border-r border-slate-100 p-4 lg:col-span-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Timeline ({visibleEvents.length} events)
          </p>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            <TimelinePanel
              events={visibleEvents}
              activeEventId={activeEventId}
              onSelect={selectEvent}
            />
          </div>
        </div>

        {/* Transcript / observation */}
        <div className="border-r border-slate-100 p-4 lg:col-span-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Moment Detail
          </p>
          {activeEvent ? (
            <motion.div
              key={activeEvent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-brand-50 p-4"
            >
              <p className="font-mono text-sm font-semibold text-brand-700">
                {msToTimestamp(activeEvent.timestampMs)}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {activeEvent.type.replace(/_/g, " ")}
              </p>
              {activeEvent.payload.text && (
                <p className="mt-2 text-sm text-slate-600">{activeEvent.payload.text}</p>
              )}
              {activeEvent.payload.flag && (
                <p className="mt-2 text-sm text-amber-700">Flag: {activeEvent.payload.flag}</p>
              )}
              {activeEvent.payload.title && (
                <p className="mt-2 text-sm text-slate-600">Question: {activeEvent.payload.title}</p>
              )}
              {activeEvent.type === "TRANSCRIPT" && activeEvent.payload.text && (
                <p className="mt-2 rounded-lg bg-white/60 p-2 text-sm italic text-slate-700">
                  &ldquo;{activeEvent.payload.text}&rdquo;
                </p>
              )}
              {activeEvent.payload.kind === "minute_snapshot" && (
                <p className="mt-2 text-sm text-purple-700">AI Minute Analysis</p>
              )}
            </motion.div>
          ) : (
            <p className="text-sm text-slate-400">
              Click a timeline event to inspect that moment
            </p>
          )}
        </div>

        {/* Code snapshot */}
        <div className="p-4 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Code at {msToTimestamp(currentMs)}
            </p>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-emerald-400 custom-scrollbar">
            {codeAtTime}
          </pre>
        </div>
      </div>
    </div>
  );
}
