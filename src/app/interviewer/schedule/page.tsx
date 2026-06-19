"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Calendar, CheckSquare, Square, Briefcase, Users, FileQuestion, Plus } from "lucide-react";

interface Position { id: string; title: string; }
interface Candidate { id: string; name: string; email: string; positionId: string; }
interface Question { id: string; title: string; type: string; difficulty: string; }

export default function SchedulePage() {
  const [userName, setUserName] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);

  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("CODING");

  const [form, setForm] = useState({ candidateId: "", scheduledAt: "", durationMins: 60 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ code: string; id: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUserName(d.user?.name ?? ""));
    fetch("/api/positions").then((r) => r.json()).then(setPositions);
    fetch("/api/candidates").then((r) => r.json()).then(setAllCandidates);
    fetch("/api/questions").then((r) => r.json()).then(setQuestionBank);
  }, []);

  const filteredCandidates = useMemo(() => {
    if (!selectedPositionId) return [];
    return allCandidates.filter((c) => c.positionId === selectedPositionId);
  }, [allCandidates, selectedPositionId]);

  // 🚀 CATEGORY FILTER: Keeps question pools cleanly categorized
  const categorizedQuestions = useMemo(() => {
    return questionBank.filter((q) => q.type === categoryFilter);
  }, [questionBank, categoryFilter]);

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, positionId: selectedPositionId, questionIds: selectedQuestionIds }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setSuccess({ code: data.code, id: data.id });
      setForm({ candidateId: "", scheduledAt: "", durationMins: 60 });
      setSelectedPositionId("");
      setSelectedQuestionIds([]);
    }
  }

  return (
    <DashboardShell role="INTERVIEWER" userName={userName || "Interviewer"} title="Schedule Interview">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader title="Configure Session Blueprint" />
          <form onSubmit={handleSchedule} className="space-y-6 p-6 pt-0">
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-indigo-600" /> 1. Job Position</label>
              <Select value={selectedPositionId} onChange={(e) => { setSelectedPositionId(e.target.value); setForm({ ...form, candidateId: "" }); }} required>
                <option value="">Select Target Position</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Users className="h-4 w-4 text-indigo-600" /> 2. Target Candidate</label>
              <Select value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })} disabled={!selectedPositionId} required>
                <option value="">{!selectedPositionId ? "Choose position first..." : "Select candidate"}</option>
                {filteredCandidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </Select>
            </div>

            {/* STEP 3 CATEGORIZED PICKER & QUICK ADD LINK */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileQuestion className="h-4 w-4 text-indigo-600" /> 3. Assign Questions
                </label>
                {/* 🚀 QUICK-JUMP TO QUESTION BANK LINK */}
                <Link 
                  href="/interviewer/questions" 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Plus className="h-3 w-3" /> Create New Question
                </Link>
              </div>

              {/* Sub-Category Filter Tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {["CODING", "SYSTEM_DESIGN", "SQL", "BEHAVIORAL"].map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                      categoryFilter === cat ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto p-2 space-y-1.5 bg-slate-50 custom-scrollbar">
                {categorizedQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">No loaded questions in this section yet.</p>
                ) : (
                  categorizedQuestions.map((q) => {
                    const isChecked = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked ? "bg-white border-indigo-500 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                          <span className="font-semibold text-slate-800">{q.title}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          q.difficulty === "Easy" ? "bg-emerald-50 text-emerald-700" :
                          q.difficulty === "Medium" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        }`}>{q.difficulty}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Date & Time" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
              <Input label="Duration (minutes)" type="number" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: parseInt(e.target.value) })} required />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              <Calendar className="h-4 w-4" /> Lock in Session
            </Button>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}