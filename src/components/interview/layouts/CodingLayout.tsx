"use client";

import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, CheckCircle, Terminal } from "lucide-react";
import type { LayoutContext } from "../types";

export function CodingLayout({ ctx }: { ctx: LayoutContext }) {
  const [theme, setTheme] = useState("vs-dark");
  const [languages, setLanguages] = useState<{ id: string; label: string }[]>([
    { id: "javascript", label: "JavaScript" },
    { id: "python", label: "Python" },
    { id: "java", label: "Java" },
    { id: "cpp", label: "C++" },
    { id: "go", label: "Go" },
  ]);

  useEffect(() => {
    fetch("/api/code/execute")
      .then((res) => res.json())
      .then((data) => {
        if (data.languages) setLanguages(data.languages);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-[#0b0f19] h-full overflow-hidden">
      {/* Code Editor Control strip */}
      <div className="h-10 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={ctx.language}
            onChange={(e) => ctx.onLanguageChange?.(e.target.value)}
            disabled={ctx.readOnly}
            className="bg-slate-800 text-slate-200 text-xs rounded border border-slate-700 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {ctx.onRunCode && (
            <button
              onClick={ctx.onRunCode}
              disabled={ctx.running}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition"
            >
              <Play className="h-3 w-3 text-emerald-400" /> Run
            </button>
          )}
          {ctx.onRunTests && (
            <button
              onClick={ctx.onRunTests}
              disabled={ctx.running}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded shadow transition"
            >
              <CheckCircle className="h-3 w-3" /> Submit Tests
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Monaco Canvas Workspace */}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language={ctx.language}
          value={ctx.code}
          theme={theme}
          onChange={(val) => ctx.onCodeChange?.(val || "")}
          options={{
            readOnly: ctx.readOnly,
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollbar: { vertical: "visible", horizontal: "visible" },
            lineNumbers: "on",
            cursorBlinking: "smooth",
            fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
          }}
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f19] text-slate-400 text-xs gap-2">
              <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              Initializing Editor IDE...
            </div>
          }
        />
      </div>

      {/* Output Console / Test Matrix Dock */}
      {(ctx.runOutput || ctx.testResults) && (
        <div className="h-44 bg-[#090d16] border-t border-slate-800 flex flex-col shrink-0 overflow-hidden">
          <div className="h-8 bg-[#111827]/60 border-b border-slate-800/80 px-4 flex items-center text-[11px] font-bold tracking-wider text-slate-400 uppercase gap-1.5 select-none">
            <Terminal className="h-3.5 w-3.5 text-sky-400" /> Terminal Workspace Output
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-300 custom-scrollbar space-y-1">
            {ctx.runOutput && (
              <>
                {ctx.runOutput.stdout && <pre className="text-emerald-400 whitespace-pre-wrap">{ctx.runOutput.stdout}</pre>}
                {ctx.runOutput.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{ctx.runOutput.stderr}</pre>}
              </>
            )}
            {ctx.testResults && ctx.testResults.map((test, index) => (
              <div key={index} className={`p-1.5 rounded text-xs border ${test.passed ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-rose-500/5 border-rose-500/20 text-rose-400"}`}>
                ✕ Test #{index + 1} Failed | Input: <code className="bg-black/20 px-1 py-0.5 rounded">{test.input}</code> Expected: <code>{test.expected}</code> Got: <code>{test.actual}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}