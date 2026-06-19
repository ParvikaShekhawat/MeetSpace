"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { Play, Database, Table } from "lucide-react";
import type { LayoutContext } from "../types";

export function SqlLayout({ ctx }: { ctx: LayoutContext }) {
  return (
    <div className="flex flex-1 flex-col bg-[#0b0f19] h-full overflow-hidden">
      <div className="h-10 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
          <Database className="h-3.5 w-3.5 text-sky-400" /> PostgreSQL Engine Compile
        </div>
        <div>
          <button
            onClick={ctx.onRunCode}
            disabled={ctx.running}
            className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded shadow transition"
          >
            <Play className="h-3 w-3" /> Query Execution
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language="sql"
          value={ctx.code}
          theme="vs-dark"
          onChange={(val) => ctx.onCodeChange?.(val || "")}
          options={{
            readOnly: ctx.readOnly,
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
            lineNumbers: "on",
            fontFamily: "Fira Code, monospace",
          }}
        />
      </div>

      {/* SQL Result Set Matrix Grid View */}
      {ctx.runOutput && (
        <div className="h-48 bg-[#090d16] border-t border-slate-800 flex flex-col shrink-0 overflow-hidden">
          <div className="h-8 bg-[#111827]/60 border-b border-slate-800/80 px-4 flex items-center text-[11px] font-bold tracking-wider text-slate-400 uppercase gap-1.5 select-none">
            <Table className="h-3.5 w-3.5 text-amber-400" /> Relational Data Output Tuple Rows
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 custom-scrollbar">
            {ctx.runOutput.success ? (
              <div className="text-emerald-400"> Query executed successfully. Rows modified or retrieved.</div>
            ) : (
              <pre className="text-rose-400 whitespace-pre-wrap">{ctx.runOutput.stderr || "Runtime Compilation Database Error"}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}