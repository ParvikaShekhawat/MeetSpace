export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { Calendar, CheckCircle, Video } from "lucide-react";

export default async function CandidateDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CANDIDATE") redirect("/interviewer/dashboard");

  const candidateProfiles = await prisma.candidate.findMany({
    where: { userId: session.id },
    select: { id: true },
  });
  const candidateIds = candidateProfiles.map((c) => c.id);

  const [upcoming, completed] = await Promise.all([
    prisma.interview.findMany({
      where: {
        candidateId: { in: candidateIds },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: { position: { select: { title: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.interview.findMany({
      where: {
        candidateId: { in: candidateIds },
        status: "COMPLETED",
      },
      include: {
        position: { select: { title: true } },
        report: { select: { overallScore: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <DashboardShell
      role="CANDIDATE"
      userName={session.name}
      title="Dashboard"
      description="Your upcoming interviews and performance history"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Upcoming</p>
              <p className="text-2xl font-bold text-slate-900">{upcoming.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{completed.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader
          title="Upcoming Interviews"
          description="Join when it's time — no external meeting link needed"
        />
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming interviews scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:border-sky-200 hover:bg-sky-50/50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {interview.position.title}
                  </p>
                  <p className="text-sm text-slate-500">{interview.code}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(interview.scheduledAt)} at{" "}
                    {formatTime(interview.scheduledAt)} · {interview.durationMins} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={interview.status} />
                  <Link href={`/interview/${interview.id}`}>
                    <Button size="sm" variant="secondary">
                      <Video className="h-3.5 w-3.5" />
                      Join Interview
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {completed.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Recent Results" />
          <div className="space-y-3">
            {completed.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {interview.position.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    Score: {interview.report?.overallScore ?? "—"}%
                  </p>
                </div>
                <Link href={`/report/${interview.id}`}>
                  <Button size="sm" variant="outline">
                    View Analysis
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
