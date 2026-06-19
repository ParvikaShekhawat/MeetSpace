import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default async function CandidateCompletedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CANDIDATE") redirect("/interviewer/dashboard");

  const candidateProfiles = await prisma.candidate.findMany({
    where: { userId: session.id },
    select: { id: true },
  });

  const interviews = await prisma.interview.findMany({
    where: {
      candidateId: { in: candidateProfiles.map((c) => c.id) },
      status: "COMPLETED",
    },
    include: {
      position: { select: { title: true } },
      report: { select: { overallScore: true } },
    },
    orderBy: { endedAt: "desc" },
  });

  return (
    <DashboardShell
      role="CANDIDATE"
      userName={session.name}
      title="Completed Interviews"
      description="Review your performance and learning insights"
    >
      <Card>
        <CardHeader title="Past Interviews" />
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
                  <p className="font-medium text-slate-900">{interview.position.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(interview.scheduledAt)} · Score:{" "}
                    {interview.report?.overallScore ?? "—"}%
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
        )}
      </Card>
    </DashboardShell>
  );
}
