import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function CompletedInterviewsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "INTERVIEWER") redirect("/candidate/dashboard");

  const interviews = await prisma.interview.findMany({
    where: {
      position: { interviewerId: session.id },
      status: "COMPLETED",
    },
    include: {
      candidate: { select: { name: true } },
      position: { select: { title: true } },
      report: { select: { overallScore: true, recommendation: true } },
    },
    orderBy: { endedAt: "desc" },
  });

  return (
    <DashboardShell
      role="INTERVIEWER"
      userName={session.name}
      title="Completed Interviews"
      description="Review reports and hiring decisions"
    >
      <Card>
        <CardHeader title="Interview Reports" />
        {interviews.length === 0 ? (
          <p className="text-sm text-slate-500">No completed interviews yet.</p>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {interview.candidate.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {interview.position.title} · {interview.code}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(interview.scheduledAt)} · Score:{" "}
                    {interview.report?.overallScore ?? "—"}% ·{" "}
                    {interview.report?.recommendation ?? "Pending"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status="COMPLETED" />
                  <Link href={`/report/${interview.id}`}>
                    <Button size="sm" variant="outline">
                      <FileText className="h-3.5 w-3.5" />
                      View Report
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
