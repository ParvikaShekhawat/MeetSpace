"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { msToTimestamp } from "@/lib/utils";
import { InterviewRoomProvider } from "@/contexts/InterviewRoomContext";
import { WebRTCVideo } from "@/components/interview/WebRTCVideo";
import { TimelinePanel } from "@/components/interview/TimelinePanel";
import { InterviewerTools } from "@/components/interview/InterviewerTools";
import { getLayout } from "@/components/interview/layouts";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { useTranscript } from "@/hooks/useTranscript";
import { TranscriptPanel } from "@/components/interview/TranscriptPanel";
import {
  Clock,
  ChevronLeft,
  Loader2,
  Layers,
  Video,
  Play,
  Square,
  FileText,
  Code,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function InterviewRoomInner({ interviewId, user }: { interviewId: string; user: SessionUser }) {
  const router = useRouter();
  const session = useInterviewSession(interviewId, user);

  const {
    loading,
    interview,
    activeQuestionIdx,
    activeQuestion,
    code,
    workspaceData,
    language,
    elapsedMs,
    events,
    running,
    runOutput,
    testResults,
    ending,
    starting,
    isInterviewer,
    isCompleted,
    isLive,
    room,
    startInterview,
    endInterview,
    switchQuestion,
    handleCodeChange,
    handleWorkspaceChange,
    handleRunCode,
    handleRunTests,
    handleFlag,
    handleHint,
    handleNote,
    handleTranscript,
    transcriptEntries,
  } = session;

  const { listening, supported } = useTranscript({
    enabled: isLive && !isCompleted,
    onTranscript: handleTranscript,
  });

  // State for Meet-style dynamic layouts
  const [activeTool, setActiveTool] = useState<"NONE" | "CODE_EDITOR" | "WHITEBOARD" | "RESUME">("CODE_EDITOR");
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // Initialize tool based on active question type
  useEffect(() => {
    if (activeQuestion) {
      const qType = activeQuestion.question.type;
      if (qType === "CODING" || qType === "SQL") {
        setActiveTool("CODE_EDITOR");
      } else if (qType === "SYSTEM_DESIGN") {
        setActiveTool("WHITEBOARD");
      } else {
        setActiveTool("NONE");
      }
    }
  }, [activeQuestionIdx, activeQuestion]);

  // Sync layout from socket broadcasts
  useEffect(() => {
    if (!room) return;
    return room.onLayoutToggle(({ tool }) => {
      setActiveTool(tool);
    });
  }, [room]);

  const handleToolChange = useCallback(
    (tool: "NONE" | "CODE_EDITOR" | "WHITEBOARD" | "RESUME") => {
      setActiveTool(tool);
      if (room?.connected) {
        room.emitLayoutToggle(tool);
      }
    },
    [room]
  );

  if (loading || !interview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a13]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070a13] text-slate-100">
        <FileText className="h-12 w-12 text-sky-400" />
        <h1 className="text-xl font-semibold">Interview Completed</h1>
        <p className="text-sm text-slate-400">This session has ended. View the report for full analysis.</p>
        <div className="flex gap-3">
          <Button onClick={() => { window.location.href = `/report/${interviewId}`; }}>View Report</Button>
          <Button variant="outline" onClick={() => { window.location.href = isInterviewer ? "/interviewer/completed" : "/candidate/completed"; }}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Resolve layout component based on active tool selection
  let LayoutComponent = null;
  if (activeTool === "CODE_EDITOR") {
    LayoutComponent = activeQuestion?.question.type === "SQL" ? getLayout("SQL") : getLayout("CODING");
  } else if (activeTool === "WHITEBOARD") {
    LayoutComponent = getLayout("SYSTEM_DESIGN");
  } else if (activeTool === "RESUME") {
    LayoutComponent = getLayout("RESUME");
  }

  const statusLabel = isLive ? "LIVE" : interview.status === "SCHEDULED" ? "WAITING" : interview.status;

  // Theme Variables
  const themeClass = isInterviewer ? "bg-white text-slate-800" : "bg-[#0f172a] text-slate-100 font-sans";
  const headerClass = isInterviewer
    ? "bg-white border-b border-orange-200 text-slate-800"
    : "bg-[#1e293b] border-b border-slate-800 text-slate-200";
  const sidebarClass = isInterviewer
    ? "bg-orange-50/30 border-r border-orange-100 text-slate-800"
    : "bg-[#0f172a] border-r border-slate-800/60 text-slate-300";
  const rightSidebarClass = isInterviewer
    ? "bg-orange-50/30 border-l border-orange-100 text-slate-800"
    : "bg-[#0f172a] border-l border-slate-800/60 text-slate-300";
  const mainClass = isInterviewer ? "bg-white" : "bg-[#020617]";
  
  const activeQuestionBtnClass = isInterviewer
    ? "border-orange-500 bg-orange-100 text-orange-700 shadow-sm"
    : "border-sky-500/40 bg-sky-500/10 text-sky-400";
  const inactiveQuestionBtnClass = isInterviewer
    ? "border-orange-200 bg-white hover:bg-orange-50 text-slate-600"
    : "border-slate-800/40 bg-slate-900/20 hover:bg-slate-800/20 text-slate-400";

  return (
    <div className={`flex h-screen flex-col font-sans ${themeClass}`}>
      {/* Top Header */}
      <header className={`flex h-14 shrink-0 items-center justify-between px-4 z-10 shadow-sm ${headerClass}`}>
        <div className="flex items-center gap-3">
          <Link
            href={isInterviewer ? "/interviewer/dashboard" : "/candidate/dashboard"}
            className="text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{interview.position.title}</span>
              <span className={`font-mono text-[10px] ${isInterviewer ? "text-orange-500" : "text-sky-400"}`}>
                {interview.code}
              </span>
            </div>
            <span className="text-xs text-slate-500">Candidate: {interview.candidate.name}</span>
          </div>
        </div>

        {/* Global Floating Action Buttons Overlay (Google Meet style) */}
        {isLive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none mt-2.5 shadow-2xl">
            <div className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/95 px-5 py-2 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 pointer-events-auto">
              <button
                onClick={() => handleToolChange("CODE_EDITOR")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeTool === "CODE_EDITOR"
                    ? "bg-orange-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                title="Code Editor Workspace"
              >
                <Code className="h-4 w-4" /> Code
              </button>
              <button
                onClick={() => handleToolChange("WHITEBOARD")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeTool === "WHITEBOARD"
                    ? "bg-orange-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                title="Collaborative Whiteboard"
              >
                <Layers className="h-4 w-4" /> Whiteboard
              </button>
              <button
                onClick={() => handleToolChange("RESUME")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeTool === "RESUME"
                    ? "bg-orange-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                title="Candidate Resume Preview"
              >
                <FileText className="h-4 w-4" /> Resume
              </button>
              <button
                onClick={() => setScreenSharing(!screenSharing)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  screenSharing
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                title="Simulate Screen Share"
              >
                <Video className="h-4 w-4" /> Screen Share
              </button>
              <button
                onClick={() => handleToolChange("NONE")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeTool === "NONE"
                    ? "bg-orange-500 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                title="Google Meet Full Video Layout"
              >
                <Maximize2 className="h-4 w-4" /> Full Video
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                onClick={endInterview}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 text-xs font-semibold transition shadow-md"
              >
                <Square className="h-3 w-3 fill-white" /> End
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs ${
            isInterviewer ? "bg-orange-50/50 border-orange-100 text-orange-600" : "bg-slate-900/80 border-slate-800 text-sky-400"
          }`}>
            <Clock className="h-3.5 w-3.5" />
            {msToTimestamp(elapsedMs)} / {interview.durationMins}:00
          </div>

          <Badge
            variant={isLive ? "success" : "warning"}
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            {statusLabel}
          </Badge>

          {!isLive && (
            <Button size="sm" onClick={startInterview} disabled={starting} className={isInterviewer ? "bg-orange-600 hover:bg-orange-500 text-white border-0" : ""}>
              <Play className="h-3.5 w-3.5" />
              {starting ? "Starting..." : "Start Interview"}
            </Button>
          )}
        </div>
      </header>

      {!isLive ? (
        // Waiting Lobby Screen
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
          <Video className="h-16 w-16 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-200">Waiting to start</h2>
          <p className="max-w-md text-sm text-slate-400 font-normal">
            {isInterviewer
              ? "Click Start Interview when you and the candidate are ready."
              : "The interviewer will start the session shortly. This page will update automatically."}
          </p>
          {room.connected && (
            <Badge variant="sky" className="text-xs">
              Connected to room — {room.participantCount} participant(s)
            </Badge>
          )}
        </div>
      ) : (
        // Live Interview Session Workspace
        <div className="flex flex-1 overflow-hidden">
          {/* Question Pipeline Left Sidebar (Collapsible - Interviewer Only) */}
          {isInterviewer && (
            <aside
              className={`flex flex-col overflow-hidden transition-all duration-300 relative ${sidebarClass} ${
                showQuestionPanel ? "w-64" : "w-14"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/20 p-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {showQuestionPanel ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Layers className={`h-3.5 w-3.5 ${isInterviewer ? "text-orange-500" : "text-sky-400"}`} />
                      Pipeline
                    </span>
                    <button onClick={() => setShowQuestionPanel(false)} className="rounded p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300" title="Collapse Sidebar">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setShowQuestionPanel(true)} className="mx-auto rounded p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300" title="Expand Sidebar">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto p-2 custom-scrollbar">
                {interview.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => showQuestionPanel && switchQuestion(idx)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      idx === activeQuestionIdx ? activeQuestionBtnClass : inactiveQuestionBtnClass
                    }`}
                    title={q.question.title}
                  >
                    <span className="text-[10px] font-bold shrink-0">Q{idx + 1}</span>
                    {showQuestionPanel && (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`truncate text-xs font-semibold ${idx === activeQuestionIdx ? "text-inherit" : "text-slate-400"}`}>
                            {q.question.title}
                          </span>
                          <Badge variant="sky" className="text-[7px] uppercase tracking-wider scale-90 origin-right shrink-0">
                            {q.question.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main workspace layout */}
          <main className={`flex flex-1 overflow-hidden relative ${mainClass}`}>
            {/* Question detail panel (Shown for interviewer if expanded, always shown for candidate if active question) */}
            {((isInterviewer && showQuestionPanel) || !isInterviewer) && activeQuestion && activeTool !== "NONE" && (
              <div className={`custom-scrollbar flex w-72 shrink-0 flex-col gap-3 overflow-y-auto p-4 border-r ${
                isInterviewer ? "bg-slate-50 border-orange-100" : "bg-[#080c18] border-slate-800/60"
              }`}>
                <div className="flex gap-1.5">
                  <Badge variant="brand" className="text-[10px] uppercase">
                    {activeQuestion.question.type.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="warning" className="text-[10px] uppercase">
                    {activeQuestion.question.difficulty}
                  </Badge>
                </div>
                <h2 className="text-sm font-semibold">{activeQuestion.question.title}</h2>
                <p className={`whitespace-pre-wrap font-sans text-xs leading-relaxed ${isInterviewer ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                  {activeQuestion.question.statement}
                </p>
                {activeQuestion.question.constraints && (
                  <div className={`rounded-lg border p-2.5 ${isInterviewer ? "bg-white border-orange-100/50" : "bg-slate-900/40 border-slate-800"}`}>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Constraints</p>
                    <p className={`mt-1 text-xs ${isInterviewer ? "text-slate-600 font-medium" : "text-slate-400"}`}>{activeQuestion.question.constraints}</p>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Workspace Area */}
            <div className="relative flex flex-1 flex-col overflow-hidden h-full">
              {screenSharing ? (
                // Simulated Screen Share Screen
                <div className="flex flex-1 flex-col items-center justify-center bg-slate-900 border-4 border-emerald-500/60 rounded-2xl m-4 p-8 text-center text-slate-100 shadow-2xl">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse mb-4">
                    <Video className="h-10 w-10" />
                  </div>
                  <h2 className="text-lg font-bold">You are screen sharing</h2>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">Other participants in this room can see your screen in real time.</p>
                  <Button className="mt-6 bg-rose-600 hover:bg-rose-500 text-white border-0 text-xs font-semibold px-5 rounded-full" onClick={() => setScreenSharing(false)}>
                    Stop Presenting
                  </Button>
                </div>
              ) : activeTool === "NONE" ? (
                // Google Meet style fullscreen layout (Video Call Expanded)
                <div className="flex-1 p-4 h-full">
                  <WebRTCVideo userName={user.name} isInterviewer={isInterviewer} layout="fullscreen" />
                </div>
              ) : (
                // Selected workspace layout component (Monaco Editor / Excalidraw / Resume)
                LayoutComponent && activeQuestion && (
                  <LayoutComponent
                    ctx={{
                      question: activeQuestion,
                      code,
                      workspaceData,
                      language,
                      readOnly: false,
                      onCodeChange: handleCodeChange,
                      onWorkspaceChange: handleWorkspaceChange,
                      onLanguageChange: (lang: string) => session.setLanguage(lang),
                      onRunCode: handleRunCode,
                      onRunTests: handleRunTests,
                      runOutput,
                      testResults,
                      running,
                      syncConnected: room.connected,
                    }}
                  />
                )
              )}
            </div>
          </main>

          {/* Right Sidebar: Video Panel (when tool active) + Timeline / Notes */}
          <aside className={`flex w-80 shrink-0 flex-col overflow-hidden ${rightSidebarClass}`}>
            {activeTool !== "NONE" && (
              <>
                <div className="flex items-center gap-1.5 border-b border-slate-800/60 p-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Video className={`h-3.5 w-3.5 ${isInterviewer ? "text-orange-500" : "text-sky-400"}`} />
                  Video Call
                </div>
                <div className="border-b border-slate-800/40">
                  <WebRTCVideo userName={user.name} isInterviewer={isInterviewer} layout="sidebar" />
                </div>
              </>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              {isInterviewer && (
                <>
                  <InterviewerTools
                    onFlag={handleFlag}
                    onHint={handleHint}
                    onNote={handleNote}
                    hintText={activeQuestion?.question.hints}
                  />
                  <div className="border-t border-orange-100 p-2.5 bg-orange-50/50">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                      Timeline ({events.length})
                    </p>
                    <div className="custom-scrollbar mt-2 max-h-40 overflow-y-auto">
                      <TimelinePanel events={events} compact />
                    </div>
                  </div>
                </>
              )}
              {/* Candidate gets nothing in this middle section to stay focused */}
              <div className="flex-1 overflow-y-auto">
                <TranscriptPanel
                  entries={transcriptEntries}
                  listening={listening}
                  supported={supported}
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function InterviewRoomPage({ params }: PageProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const unwrappedParams = React.use(params);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a13]">
        <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a13] text-white">
        <div className="text-center">
          <p className="mb-4">Please log in to join this interview.</p>
          <Link href="/login" className="text-sky-400 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <InterviewRoomProvider
      interviewId={unwrappedParams.id}
      userId={user.id}
      userName={user.name}
      role={user.role}
    >
      <InterviewRoomInner interviewId={unwrappedParams.id} user={user} />
    </InterviewRoomProvider>
  );
}
