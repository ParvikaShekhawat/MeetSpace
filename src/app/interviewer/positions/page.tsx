"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Plus, Users } from "lucide-react";

interface Position {
  id: string;
  title: string;
  durationMins: number;
  interviewType: string;
  _count: { candidates: number; interviews: number };
}

export default function PositionsPage() {
  const [userName, setUserName] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    durationMins: 60,
    interviewType: "Technical Round",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUserName(d.user?.name ?? ""));
    loadPositions();
  }, []);

  async function loadPositions() {
    const res = await fetch("/api/positions");
    const data = await res.json();
    setPositions(Array.isArray(data) ? data : []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", durationMins: 60, interviewType: "Technical Round" });
    setShowForm(false);
    setLoading(false);
    loadPositions();
  }

  return (
    <DashboardShell
      role="INTERVIEWER"
      userName={userName || "Interviewer"}
      title="Positions"
      description="Create and manage hiring positions"
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New Position
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="Create Position" />
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Position Title"
              placeholder="Backend Engineer Intern"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Input
              label="Duration (minutes)"
              type="number"
              value={form.durationMins}
              onChange={(e) =>
                setForm({ ...form, durationMins: parseInt(e.target.value) })
              }
            />
            <Select
              label="Interview Type"
              value={form.interviewType}
              onChange={(e) => setForm({ ...form, interviewType: e.target.value })}
            >
              <option>Technical Round</option>
              <option>System Design Round</option>
              <option>Behavioral Round</option>
            </Select>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={loading}>
                Create Position
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {positions.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.interviewType}</p>
                <p className="mt-1 text-xs text-slate-400">{p.durationMins} min</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <Users className="h-5 w-5 text-brand-600" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm text-slate-600">
              <span>{p._count.candidates} candidates</span>
              <span>{p._count.interviews} interviews</span>
            </div>
            <Link href={`/interviewer/candidates?positionId=${p.id}`}>
              <Button variant="outline" size="sm" className="mt-4 w-full">
                Manage Candidates
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
