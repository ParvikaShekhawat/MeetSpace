"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInterviewRoom } from "@/contexts/InterviewRoomContext";
import { DEFAULT_CODE, DEFAULT_SQL, parseWorkspaceData, type QuestionData } from "@/components/interview/types";
import { generateMinuteSnapshot } from "@/lib/minute-snapshot";

export interface TimelineEvent {
  id: string;
  timestampMs: number;
  type: string;
  payload: Record<string, string | undefined>;
}

export interface InterviewData {
  id: string;
  code: string;
  status: string;
  durationMins: number;
  startedAt: string | null;
  candidate: { name: string };
  position: { title: string; interviewerId: string };
  questions: QuestionData[];
}

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export function useInterviewSession(interviewId: string, user: SessionUser) {
  const router = useRouter();
  const room = useInterviewRoom();

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [workspaceData, setWorkspaceData] = useState<Record<string, unknown>>({});
  const [language, setLanguage] = useState("javascript");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<{ stdout: string; stderr: string; success: boolean } | null>(null);
  const [testResults, setTestResults] = useState<Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }> | null>(null);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState<
    Array<{ id: string; timestampMs: number; text: string }>
  >([]);

  const elapsedRef = useRef(0);
  const lastMinuteRef = useRef(0);
  const codeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteCodeUpdate = useRef(false);

  const isInterviewer = user.role === "INTERVIEWER";
  const activeQuestion = interview?.questions[activeQuestionIdx];
  const isCompleted = interview?.status === "COMPLETED";
  const isLive = interview?.status === "IN_PROGRESS";

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/interviews/${interviewId}/events`);
    if (!res.ok) return;
    const data = await res.json();
    setEvents(
      data.map((e: { id: string; timestampMs: number; type: string; payload: string }) => ({
        id: e.id,
        timestampMs: e.timestampMs,
        type: e.type,
        payload: JSON.parse(e.payload || "{}"),
      }))
    );
  }, [interviewId]);

  const loadInterview = useCallback(async () => {
    const intRes = await fetch(`/api/interviews/${interviewId}`);
    if (!intRes.ok) {
      router.push(isInterviewer ? "/interviewer/dashboard" : "/candidate/dashboard");
      return;
    }
    const data: InterviewData = await intRes.json();
    setInterview(data);

    const firstQuestion = data.questions[0];
    if (firstQuestion) {
      const qType = firstQuestion.question.type;
      const initialCode =
        firstQuestion.finalCode ||
        (qType === "SQL" ? DEFAULT_SQL : DEFAULT_CODE);
      setCode(initialCode);
      setWorkspaceData(parseWorkspaceData(firstQuestion.workspaceData));
      setLanguage(qType === "SQL" ? "sql" : "javascript");
    }

    if (data.startedAt) {
      const started = new Date(data.startedAt).getTime();
      const elapsed = Math.max(0, Date.now() - started);
      setElapsedMs(elapsed);
      elapsedRef.current = elapsed;
      lastMinuteRef.current = Math.floor(elapsed / 60000);
    }

    await loadEvents();
    setLoading(false);
  }, [interviewId, router, isInterviewer, loadEvents]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  const recordEvent = useCallback(
    async (type: string, payload: Record<string, string | undefined>, timestampMs?: number) => {
      const ts = timestampMs ?? elapsedRef.current;
      const res = await fetch(`/api/interviews/${interviewId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, timestampMs: ts, payload }),
      });
      if (!res.ok) return null;
      const event = await res.json();
      const parsed: TimelineEvent = {
        id: event.id,
        timestampMs: event.timestampMs,
        type: event.type,
        payload: JSON.parse(event.payload || "{}"),
      };
      setEvents((prev) => [...prev, parsed].sort((a, b) => a.timestampMs - b.timestampMs));
      room.emitRoomEvent(parsed);
      return parsed;
    },
    [interviewId, room]
  );

  const startInterview = useCallback(async () => {
    setStarting(true);
    const res = await fetch(`/api/interviews/${interviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInterview((prev) => (prev ? { ...prev, status: updated.status, startedAt: updated.startedAt } : prev));
      await loadEvents();
    }
    setStarting(false);
  }, [interviewId, loadEvents]);

  const endInterview = useCallback(async () => {
    if (!confirm("End this interview and generate the report?")) return;
    setEnding(true);
    const res = await fetch(`/api/interviews/${interviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", elapsedMs: elapsedRef.current }),
    });
    if (res.ok) {
      router.push(`/report/${interviewId}`);
    }
    setEnding(false);
  }, [interviewId, router]);

  // Timer
  useEffect(() => {
    if (!isLive || isCompleted) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + 1000;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, isCompleted]);

  // Minute snapshots
  useEffect(() => {
    if (!isLive || isCompleted) return;
    const currentMinute = Math.floor(elapsedMs / 60000);
    if (currentMinute > lastMinuteRef.current && currentMinute > 0) {
      lastMinuteRef.current = currentMinute;
      const analysis = generateMinuteSnapshot(events, activeQuestion, currentMinute);
      recordEvent("NOTE", {
        kind: "minute_snapshot",
        minute: String(currentMinute),
        text: analysis,
        questionTitle: activeQuestion?.question.title,
      });
    }
  }, [elapsedMs, isLive, isCompleted, events, activeQuestion, recordEvent]);

  // Remote code sync
  useEffect(() => {
    return room.onCodeUpdate(({ questionId, code: remoteCode, language: remoteLang, userId }) => {
      if (userId === room.userId || questionId !== activeQuestion?.question.id) return;
      isRemoteCodeUpdate.current = true;
      setCode(remoteCode);
      setLanguage(remoteLang);
      setTimeout(() => {
        isRemoteCodeUpdate.current = false;
      }, 50);
    });
  }, [room, activeQuestion?.question.id]);

  // Remote question switch
  useEffect(() => {
    return room.onQuestionSwitch(({ questionIdx }) => {
      switchQuestion(questionIdx, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, interview?.questions]);

  // Remote room events
  useEffect(() => {
    return room.onRoomEvent((event) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === event.id)) return prev;
        return [...prev, event].sort((a, b) => a.timestampMs - b.timestampMs);
      });
    });
  }, [room]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (isRemoteCodeUpdate.current || isCompleted) return;
      setCode(newCode);
      if (room.connected && activeQuestion) {
        room.emitCodeUpdate(activeQuestion.question.id, newCode, language);
        if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
        codeDebounceRef.current = setTimeout(() => {
          recordEvent("CODE_CHANGE", {
            questionId: activeQuestion.question.id,
            code: newCode,
            language,
          });
          fetch(`/api/interviews/${interviewId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: activeQuestion.question.id,
              code: newCode,
              language,
            }),
          }).catch(() => {});
        }, 2000);
      }
    },
    [room, activeQuestion, language, isCompleted, recordEvent]
  );

  const switchQuestion = useCallback(
    (idx: number, broadcast = true) => {
      if (!interview || idx < 0 || idx >= interview.questions.length) return;
      setActiveQuestionIdx(idx);
      const q = interview.questions[idx];
      const qType = q.question.type;
      setCode(q.finalCode || (qType === "SQL" ? DEFAULT_SQL : DEFAULT_CODE));
      setWorkspaceData(parseWorkspaceData(q.workspaceData));
      setLanguage(qType === "SQL" ? "sql" : "javascript");
      setRunOutput(null);
      setTestResults(null);

      if (broadcast && isLive) {
        room.emitQuestionSwitch(idx, q.question.id, q.question.title);
        recordEvent("QUESTION_STARTED", {
          questionId: q.question.id,
          title: q.question.title,
          order: String(idx + 1),
        });
      }
    },
    [interview, isLive, room, recordEvent]
  );

  const handleRunCode = useCallback(async () => {
    if (!activeQuestion) return;
    setRunning(true);
    setRunOutput(null);
    setTestResults(null);
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          questionId: activeQuestion.question.id,
          mode: "run",
        }),
      });
      const data = await res.json();
      setRunOutput({
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        success: data.success ?? false,
      });
    } finally {
      setRunning(false);
    }
  }, [activeQuestion, code, language]);

  const handleRunTests = useCallback(async () => {
    if (!activeQuestion) return;
    setRunning(true);
    setRunOutput(null);
    setTestResults(null);
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          questionId: activeQuestion.question.id,
          mode: "tests",
        }),
      });
      const data = await res.json();
      setTestResults(data.results || []);
    } finally {
      setRunning(false);
    }
  }, [activeQuestion, code, language]);

  const handleFlag = useCallback(
    (flag: string) => {
      recordEvent("FLAG", { flag, questionId: activeQuestion?.question.id });
    },
    [recordEvent, activeQuestion]
  );

  const handleHint = useCallback(() => {
    const hintText = activeQuestion?.question.hints?.split("\n")[0] || "Consider the optimal data structure.";
    recordEvent("HINT", {
      questionId: activeQuestion?.question.id,
      text: hintText,
      title: activeQuestion?.question.title,
    });
  }, [recordEvent, activeQuestion]);

  const handleNote = useCallback(
    (text: string) => {
      recordEvent("NOTE", {
        text,
        questionId: activeQuestion?.question.id,
        kind: "timeline_note",
      });
    },
    [recordEvent, activeQuestion]
  );

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal || !isLive) return;
      const id = `tr-${Date.now()}`;
      setTranscriptEntries((prev) => [...prev, { id, timestampMs: elapsedRef.current, text }].slice(-50));
      recordEvent("TRANSCRIPT", {
        text,
        questionId: activeQuestion?.question.id,
      });
    },
    [isLive, recordEvent, activeQuestion]
  );

  const handleWorkspaceChange = useCallback(
    (newData: Record<string, unknown>) => {
      setWorkspaceData((prev) => {
        const merged = { ...prev, ...newData };
        if (isLive && activeQuestion) {
          recordEvent("WHITEBOARD_CHANGE", {
            questionId: activeQuestion.question.id,
            workspaceData: JSON.stringify(merged),
          });
        }
        return merged;
      });
    },
    [isLive, activeQuestion, recordEvent]
  );

  // Poll for status updates (start and end transitions)
  useEffect(() => {
    if (!interview || interview.status === "COMPLETED") return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/interviews/${interviewId}`);
      if (!res.ok) return;
      const data: InterviewData = await res.json();
      if (data.status !== interview.status) {
        setInterview(data);
        if (data.startedAt) {
          const started = new Date(data.startedAt).getTime();
          const elapsed = Math.max(0, Date.now() - started);
          setElapsedMs(elapsed);
          elapsedRef.current = elapsed;
        }
        await loadEvents();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [interview, interviewId, loadEvents]);

  return {
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
    setLanguage,
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
  };
}
