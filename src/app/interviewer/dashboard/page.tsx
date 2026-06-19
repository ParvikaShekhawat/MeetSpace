export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils";
import { Calendar, Users, Briefcase, ArrowRight, Video } from "lucide-react";

export default async function InterviewerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "INTERVIEWER") redirect("/candidate/dashboard");

  const [positions, upcoming, completed] = await Promise.all([
    prisma.position.count({ where: { interviewerId: session.id } }),
    prisma.interview.findMany({
      where: {
        position: { interviewerId: session.id },
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      include: {
        candidate: { select: { name: true } },
        position: { select: { title: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.interview.count({
      where: {
        position: { interviewerId: session.id },
        status: "COMPLETED",
      },
    }),
  ]);

  const stats = [
    { label: "Positions", value: positions, icon: Briefcase, iconClassName: "bg-brand-100 text-brand-600", trend: "Active roles" },
    { label: "Upcoming", value: upcoming.length, icon: Calendar, iconClassName: "bg-sky-100 text-sky-600", trend: "Scheduled sessions" },
    { label: "Completed", value: completed, icon: Users, iconClassName: "bg-emerald-100 text-emerald-600", trend: "Reports ready" },
  ];

  return (
    <DashboardShell
      role="INTERVIEWER"
      userName={session.name}
      title="Dashboard"
      description="Manage positions, candidates, and interviews"
      action={
        <Link href="/interviewer/schedule">
          <Button>
            <Calendar className="h-4 w-4" />
            Schedule Interview
          </Button>
        </Link>
      }
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map(({ label, value, icon, iconClassName, trend }) => (
          <StatCard key={label} label={label} value={value} icon={icon} iconClassName={iconClassName} trend={trend} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Upcoming Interviews"
            description="Interviews scheduled for your positions"
            action={
              <Link href="/interviewer/schedule">
                <Button size="sm" variant="outline">
                  Schedule
                </Button>
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming interviews.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {interview.candidate.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {interview.position.title} · {interview.code}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(interview.scheduledAt)} at{" "}
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

        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common tasks to get started"
          />
          <div className="space-y-3">
            {[
              { href: "/interviewer/positions", label: "Create Position", desc: "Add a new role to hire for" },
              { href: "/interviewer/schedule", label: "Schedule Interview", desc: "Pick candidate, date, and questions" },
              { href: "/interviewer/completed", label: "View Reports", desc: "Review completed interview reports" },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
              >
                <div>
                  <p className="font-medium text-slate-900">{label}</p>
                  <p className="text-sm text-slate-500">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-brand-600" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
