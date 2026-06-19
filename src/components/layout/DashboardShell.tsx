"use client";

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  LogOut,
  Video,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  role: "INTERVIEWER" | "CANDIDATE";
  userName: string;
}

const interviewerLinks = [
  { href: "/interviewer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interviewer/positions", label: "Positions", icon: Users },
  { href: "/interviewer/candidates", label: "Candidates", icon: Users },
  { href: "/interviewer/questions", label: "Question Bank", icon: BookOpen },
  { href: "/interviewer/schedule", label: "Schedule", icon: Calendar },
  { href: "/interviewer/completed", label: "Completed", icon: FileText },
];

const candidateLinks = [
  { href: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidate/upcoming", label: "Upcoming", icon: Calendar },
  { href: "/candidate/completed", label: "Completed", icon: FileText },
];

export function DashboardSidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "INTERVIEWER" ? interviewerLinks : candidateLinks;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-sky-500 shadow-sm">
            <Video className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-brand-900">MeetSpace</span>
        </Link>
      </div>

      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {role === "INTERVIEWER" ? "Interviewer" : "Candidate"}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{userName}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/20"
                  : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function DashboardShell({
  role,
  userName,
  title,
  description,
  children,
  action,
}: SidebarProps & {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50/80">
      <DashboardSidebar role={role} userName={userName} />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 px-8 py-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            {action}
          </div>
        </div>
        <div className="animate-fade-in p-8">{children}</div>
      </main>
    </div>
  );
}
