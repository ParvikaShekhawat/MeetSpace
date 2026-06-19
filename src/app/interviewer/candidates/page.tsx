"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UserPlus } from "lucide-react";

interface Position {
  id: string;
  title: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  resumeUrl: string | null;
  position: { title: string };
}

function CandidatesContent() {
  const searchParams = useSearchParams();
  const preselectedPosition = searchParams.get("positionId") ?? "";

  const [userName, setUserName] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    positionId: preselectedPosition,
    resumeUrl: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUserName(d.user?.name ?? ""));
    fetch("/api/positions").then((r) => r.json()).then(setPositions);
    loadCandidates();
  }, []);

  async function loadCandidates() {
    const res = await fetch("/api/candidates");
    setCandidates(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", email: "", positionId: preselectedPosition, resumeUrl: "" });
    setLoading(false);
    loadCandidates();
  }

  return (
    <DashboardShell
      role="INTERVIEWER"
      userName={userName || "Interviewer"}
      title="Candidates"
      description="Add candidates to positions"
    >
      <Card className="mb-8">
        <CardHeader
          title="Add Candidate"
          description="Candidate account is created automatically if email is new"
        />
        <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            placeholder="Parvika Shekhawat"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="candidate@gmail.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Select
            label="Position"
            value={form.positionId}
            onChange={(e) => setForm({ ...form, positionId: e.target.value })}
            required
          >
            <option value="">Select position</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <Input
            label="Resume URL (optional)"
            placeholder="/resumes/resume.pdf"
            value={form.resumeUrl}
            onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="All Candidates" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Position</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-3 text-slate-600">{c.email}</td>
                  <td className="py-3 text-slate-600">{c.position.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense>
      <CandidatesContent />
    </Suspense>
  );
}
