"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { TimelinePanel } from "@/components/interview/TimelinePanel";
import { CodeEvolution } from "@/components/report/CodeEvolution";
import { useToast } from "@/components/ui/Toast";
import { formatDate, msToTimestamp } from "@/lib/utils";
import type { ReportData } from "@/types"; // 🚀 Cleanly using this imported type now
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  ListChecks,
  Play,
  MessageSquare,
  Gavel,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReportPage({ params }: PageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Unwrap the async params using React.use()
  const unwrappedParams = React.use(params);
  const reportId = unwrappedParams.id;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [tab, setTab] = useState("overview");
  const [decision, setDecision] = useState({
    interviewerDecision: "Hire",
    recommendation: "Hire",
    finalComments: "",
    interviewerNotes: "",
  });
  const [saving, setSaving] = useState(false);

  const isInterviewer = report?.role === "INTERVIEWER";

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/interviews/${reportId}/report`).then((r) => r.json()),
    ]).then(([me, data]) => {
      if (!me.user) { router.push("/login"); return; }
      setUserName(me.user.name);
      if (data.error) { router.push("/dashboard"); return; }
      setReport(data);
      setDecision({
        interviewerDecision: data.interviewerDecision ?? data.recommendation ?? "Hire",
        recommendation: data.recommendation ?? "Hire",
        finalComments: data.finalComments ?? "",
        interviewerNotes: data.interviewerNotes ?? "",
      });
      setLoading(false);
    });
  }, [reportId, router]);

  async function saveDecision() {
    setSaving(true);
    await fetch(`/api/interviews/${reportId}/report`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
    });
    setSaving(false);
    toast("Decision submitted successfully", "success");
  }

  if (loading || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const role = isInterviewer ? "INTERVIEWER" : "CANDIDATE";
  const dashHref = isInterviewer ? "/interviewer/completed" : "/candidate/completed";

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "questions", label: "Questions", icon: <ListChecks className="h-4 w-4" /> },
    { id: "code", label: "Code Evolution", icon: <ListChecks className="h-4 w-4" /> },
    { id: "replay", label: "Replay", icon: <Play className="h-4 w-4" /> },
    { id: "communication", label: "Communication", icon: <MessageSquare className="h-4 w-4" /> },
    ...(isInterviewer
      ? [{ id: "decision", label: "Decision", icon: <Gavel className="h-4 w-4" /> }]
      : []),
  ];

  return (
    <DashboardShell
      role={role as "INTERVIEWER" | "CANDIDATE"}
      userName={userName}
      title={isInterviewer ? "Interview Report" : "Performance Analysis"}
      description={
        isInterviewer ? "Should we hire this candidate?" : "How can you improve?"
      }
    >
      <Link
        href={dashHref}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header card */}
      <Card className="mb-6 overflow-hidden p-0">
        <div className="gradient-brand px-6 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{report.candidateName}</h2>
              <p className="text-brand-100">{report.positionTitle}</p>
              <p className="mt-1 text-sm text-brand-200/80">
                {report.code} · {formatDate(report.scheduledAt)} · {report.durationMins} min
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{report.overallScore}%</p>
              <Badge className="mt-1 bg-white/20 text-white">{report.recommendation}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100">
          {[
            { label: "Asked", value: report.questionsAsked },
            { label: "Solved", value: report.questionsSolved },
            { label: "Hints", value: report.hintsUsed },
            { label: "Events", value: report.events.length },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6" />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === "overview" && (
          <div className="space-y-6">
            {report.aiSummary && (
              <Card>
                <CardHeader
                  title="AI Summary"
                  action={
                    report.aiGenerated ? (
                      <Badge variant="brand">GPT Powered</Badge>
                    ) : (
                      <Badge>Heuristic</Badge>
                    )
                  }
                />
                <p className="leading-relaxed text-slate-600">{report.aiSummary}</p>
              </Card>
            )}

            {report.sectionWiseFeedback && (
              <Card>
                <CardHeader title="Section-Wise Feedback" />
                <div className="space-y-2">
                  {report.sectionWiseFeedback.split("\n").filter(Boolean).map((line, idx) => (
                    <p key={idx} className="text-sm text-slate-700">{line}</p>
                  ))}
                </div>
              </Card>
            )}

            {!isInterviewer && report.candidateBetterApproach && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader title="Suggested Better Approach" />
                <div className="rounded-lg p-4 bg-white border border-emerald-100 shadow-sm">
                  <p className="text-sm text-emerald-900 leading-relaxed font-medium">
                    {report.candidateBetterApproach}
                  </p>
                </div>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Strengths" />
                <ul className="space-y-2">
                  {(report.strengths ?? "").split("\n").filter(Boolean).map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader title={isInterviewer ? "Weaknesses & Risks" : "Areas to Improve"} />
                <ul className="space-y-2">
                  {(report.weaknesses ?? "").split("\n").filter(Boolean).map((w) => (
                    <li key={w} className="flex items-start gap-2 text-sm text-slate-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {report.competencyScores && report.competencyScores.length > 0 && (
              <Card>
                <CardHeader title="Competency Scorecard" />
                <div className="space-y-4">
                  {report.competencyScores.map((c) => (
                    <div key={c.name}>
                      <ProgressBar label={c.name} value={c.score} max={10} />
                      <p className="mt-1 text-xs text-slate-500">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {!isInterviewer && report.learningPlan && report.learningPlan.length > 0 && (
              <Card>
                <CardHeader title="Personalized Learning Plan" />
                <div className="space-y-3">
                  {report.learningPlan.map((item) => (
                    <div
                      key={item.topic}
                      className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 transition-colors hover:bg-brand-50"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-brand-900">{item.topic}</p>
                        <Badge variant={item.priority === "High" ? "warning" : "sky"}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.action}</p>
                      <p className="mt-1 text-xs text-brand-600">Est. {item.hours} hours</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === "questions" && (
          <div className="space-y-4">
            {report.questions.map((q, i) => {
              const qEvents = report.events.filter(
                (e) =>
                  e.payload.questionId === q.questionRefId ||
                  e.payload.title === q.title
              );
              const hints = qEvents.filter((e) => e.type === "HINT").length;
              const flags = qEvents.filter((e) => e.type === "FLAG");

              return (
                <Card key={q.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      Q{i + 1}: {q.title}
                    </span>
                    <Badge variant="brand">{q.type.replace("_", " ")}</Badge>
                    <Badge>{q.difficulty}</Badge>
                    {hints > 0 && <Badge variant="warning">{hints} hint(s)</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{q.statement}</p>

                  {flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {flags.map((f) => (
                        <Badge key={f.id} variant="warning">
                          {f.payload.flag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {isInterviewer && q.notes && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="text-xs font-bold uppercase text-amber-700">Interviewer Notes</p>
                      {q.notes}
                    </div>
                  )}

                  {q.finalCode && (
                    <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 custom-scrollbar">
                      {q.finalCode}
                    </pre>
                  )}

                  {!isInterviewer && (
                    <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-sm text-slate-700">
                      <p className="font-medium text-brand-900">Improvement Tips</p>
                      <p className="mt-1">
                        Review your approach in the Replay tab. Focus on clarifying requirements early and
                        discussing time/space complexity before coding.
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === "code" && (
          <Card>
            <CardHeader title="Code Evolution" description="How the solution evolved during the interview" />
            {report.questions
              .filter((q) => q.type === "CODING" || q.type === "SQL")
              .map((q) => (
                <div key={q.id} className="mb-8 last:mb-0">
                  <CodeEvolution
                    events={report.events as any}
                    finalCode={q.finalCode}
                    questionTitle={q.title}
                    questionRefId={q.questionRefId}
                    isInterviewer={isInterviewer}
                  />
                </div>
              ))}
            {report.questions.filter((q) => q.type === "CODING" || q.type === "SQL").length === 0 && (
              <p className="text-sm text-slate-500">No coding questions in this interview.</p>
            )}
          </Card>
        )}

        {tab === "replay" && (
          <Card>
            <CardHeader 
              title="Session Timeline" 
              description="A chronological timeline of important events, approaches, and issues during the interview."
            />
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
              <TimelinePanel events={report.events as any} />
            </div>
          </Card>
        )}

        {tab === "communication" && (
          <Card>
            <CardHeader title="Communication Analysis" />
            {report.competencyScores ? (
              <div className="space-y-6">
                {report.competencyScores
                  .filter((c) =>
                    ["Communication", "Problem Solving", "Edge Case Handling"].includes(c.name)
                  )
                  .map((c) => (
                    <div key={c.name} className="rounded-xl border border-slate-100 p-4">
                      <ProgressBar label={c.name} value={c.score} max={10} />
                      <p className="mt-2 text-sm text-slate-600">{c.evidence}</p>
                      {report.events
                        .filter((e) => e.type === "NOTE" || e.type === "FLAG")
                        .slice(0, 2)
                        .map((e) => (
                          <p key={e.id} className="mt-1 text-xs text-slate-400">
                            Evidence at {msToTimestamp(e.timestampMs)}:{" "}
                            {e.payload.text || e.payload.flag}
                          </p>
                        ))}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No communication data available.</p>
            )}
          </Card>
        )}

        {tab === "decision" && isInterviewer && (
          <Card>
            <CardHeader title="Final Hiring Decision" description="Submit your recommendation" />
            <Select
              label="Recommendation"
              value={decision.interviewerDecision}
              onChange={(e) =>
                setDecision({
                  ...decision,
                  interviewerDecision: e.target.value,
                  recommendation: e.target.value,
                })
              }
            >
              <option>Strong Hire</option>
              <option>Hire</option>
              <option>Borderline</option>
              <option>Reject</option>
            </Select>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Overall Interview Notes</label>
              <textarea
                value={decision.interviewerNotes}
                onChange={(e) => setDecision({ ...decision, interviewerNotes: e.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Private notes for hiring discussion..."
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Final Comments</label>
              <textarea
                value={decision.finalComments}
                onChange={(e) => setDecision({ ...decision, finalComments: e.target.value })}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Overall hiring discussion notes..."
              />
            </div>
            <Button className="mt-4" onClick={saveDecision} disabled={saving}>
              {saving ? "Submitting..." : "Submit Decision"}
            </Button>
          </Card>
        )}
      </motion.div>
    </DashboardShell>
  );
}