import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { Video } from "lucide-react";

export default async function CandidateUpcomingPage() {
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
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
    include: { position: { select: { title: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <DashboardShell
      role="CANDIDATE"
      userName={session.name}
      title="Upcoming Interviews"
      description="All scheduled interviews attached to your account"
    >
      <Card>
        {interviews.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled yet.</p>
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
                    {interview.code} · {formatDate(interview.scheduledAt)} at{" "}
                    {formatTime(interview.scheduledAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={interview.status} />
                  <Link href={`/interview/${interview.id}`}>
                    <Button size="sm">
                      <Video className="h-3.5 w-3.5" />
                      Join
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
