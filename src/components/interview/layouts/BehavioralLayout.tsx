"use client";

import React from "react";
import { MessageSquare, ShieldAlert } from "lucide-react";
import type { LayoutContext } from "../types";

export function BehavioralLayout({ ctx }: { ctx: LayoutContext }) {
  return (
    <div className="flex flex-1 bg-[#0b0f19] h-full overflow-hidden p-4 gap-4">
      {/* Left Column Input Workspace Field Area */}
      <div className="flex-1 flex flex-col bg-[#111827]/40 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="h-10 border-b border-slate-800/80 bg-[#111827]/80 px-4 flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wide">
          <MessageSquare className="h-3.5 w-3.5 text-sky-400" /> Active Candidate Notes Response Area
        </div>
        <textarea
          value={ctx.code}
          onChange={(e) => ctx.onCodeChange?.(e.target.value)}
          disabled={ctx.readOnly}
          placeholder="Document architecture responses, behavioral scenario outlines, STAR method logs, or conversational tracking metrics..."
          className="flex-1 w-full p-4 bg-transparent text-slate-200 text-sm font-sans resize-none focus:outline-none leading-relaxed placeholder:text-slate-600 custom-scrollbar"
        />
      </div>

      {/* Right Column Evaluation Scoring / Criteria Matrix Sidebar */}
      <div className="w-80 border border-slate-800/80 bg-[#111827]/20 rounded-xl p-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Core Target Metrics
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <p className="font-semibold text-slate-300 mb-1">💡 Evaluation Framework</p>
            Assess problem formulation, runtime efficiency trade-offs, response structure clarity, and system design patterns.
          </div>
        </div>
      </div>
    </div>
  );
}