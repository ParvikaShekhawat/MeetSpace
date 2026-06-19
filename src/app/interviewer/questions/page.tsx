"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, X, Loader2, FileText, Trash2 } from "lucide-react";

interface Question {
  id: string;
  title: string;
  type: "CODING" | "SYSTEM_DESIGN" | "SQL" | "BEHAVIORAL";
  difficulty: string;
  statement: string;
  constraints?: string | null;
  hints?: string | null;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "CODING",
    difficulty: "Medium",
    statement: "",
    constraints: "",
    hints: "",
  });

  // Fetch Session + Questions
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/questions").then((r) => r.json()),
    ])
      .then(([authData, qData]) => {
        if (!authData.user) {
          router.push("/login");
          return;
        }
        if (authData.user.role !== "INTERVIEWER") {
          router.push("/candidate/dashboard");
          return;
        }
        setUserName(authData.user.name);
        setQuestions(qData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  // Grouping logic
  const grouped = useMemo(() => {
    return questions.reduce((acc, q) => {
      const type = q.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(q);
      return acc;
    }, {} as Record<string, Question[]>);
  }, [questions]);

  const typeLabels: Record<string, string> = {
    CODING: "Coding",
    SYSTEM_DESIGN: "System Design",
    SQL: "Database / SQL",
    BEHAVIORAL: "Behavioral",
  };

  // Add Question Submission
  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type.toUpperCase(),
          difficulty: form.difficulty,
          statement: form.statement,
          constraints: form.constraints || null,
          hints: form.hints || null,
        }),
      });

      if (res.ok) {
        const newQuestion = await res.json();
        setQuestions((prev) => [newQuestion, ...prev]); 
        setIsOpen(false); 
        setForm({
          title: "",
          type: "CODING",
          difficulty: "Medium",
          statement: "",
          constraints: "",
          hints: "",
        });
      } else {
        const errData = await res.json();
        alert(`Error saving question: ${errData.error || "Unknown server response"}`);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Network error: Could not reach backend handler.");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete Action Handler
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const res = await fetch(`/api/questions?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete question");
      }
    } catch (err) {
      alert("Network error occurred while trying to delete.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <DashboardShell
      role="INTERVIEWER"
      userName={userName}
      title="Question Bank"
      description="Questions auto-load the correct interview layout by type"
    >
      {/* HEADER ACTION AREA */}
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setIsOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> Add New Question
        </Button>
      </div>

      {/* YOUR CARD GRID LAYOUT */}
      <div className="space-y-8">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm">
            No questions discovered. Click "Add New Question" above to start populating your pool.
          </div>
        ) : (
          Object.entries(grouped).map(([type, qs]) => (
            <div key={type}>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 flex items-center gap-2">
                {typeLabels[type] ?? type}
                <span className="text-sm font-normal text-slate-400">({qs.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {qs.map((q) => (
                  <Card key={q.id} className="p-4 transition-all duration-300 hover:border-indigo-200 hover:shadow-md relative group">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 pr-6">{q.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="brand">{q.difficulty}</Badge>
                        
                        {/* 🚀 TRASH DELETION BUTTON INSTALLED HERE */}
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-500 min-h-[60px]">{q.statement}</p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="sky">{typeLabels[q.type] ?? q.type}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATION MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-600" /> Create Question
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Add this problem statement straight into rotation pools.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-4 mt-4">
              <Input
                label="Question Title"
                placeholder="e.g., Reverse a Linked List"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Layout Environment Type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="CODING">Coding (IDE Layout)</option>
                  <option value="SYSTEM_DESIGN">System Design (Whiteboard Layout)</option>
                  <option value="SQL">Database / SQL (Query Layout)</option>
                  <option value="BEHAVIORAL">Behavioral (Split Notes Layout)</option>
                </Select>
                <Select
                  label="Target Difficulty"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Problem Statement Description</label>
                <textarea
                  placeholder="Provide explicit instructions, guidelines, and context..."
                  value={form.statement}
                  onChange={(e) => setForm({ ...form, statement: e.target.value })}
                  rows={4}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Constraints (Optional)"
                  placeholder="e.g., O(n) time, O(1) space"
                  value={form.constraints}
                  onChange={(e) => setForm({ ...form, constraints: e.target.value })}
                />
                <Input
                  label="Helpful Hints (Optional)"
                  placeholder="e.g., Use two sliding pointers..."
                  value={form.hints}
                  onChange={(e) => setForm({ ...form, hints: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Question"}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}
    </DashboardShell>
  );
}