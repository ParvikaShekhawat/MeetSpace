import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import {
  Video,
  Code2,
  Clock,
  FileBarChart,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Unified Interview Room",
    description:
      "Video, coding, notes, and timer in one place. No Google Meet or scattered tools.",
  },
  {
    icon: Code2,
    title: "Question-Specific Layouts",
    description:
      "Coding questions load a full IDE layout. System design loads a whiteboard. Automatically.",
  },
  {
    icon: Clock,
    title: "Timeline & Evidence",
    description:
      "Every note, flag, and code change is timestamped for evidence-based hiring decisions.",
  },
  {
    icon: FileBarChart,
    title: "Dual Reports",
    description:
      "Interviewer report answers 'Should we hire?' Candidate report answers 'How do I improve?'",
  },
];

const steps = [
  "Create a position and add candidates",
  "Schedule interview — room link generated automatically",
  "Both parties join the same interview room",
  "End interview — reports generated instantly",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(14,165,233,0.06),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-brand-700 shadow-sm">
              <Shield className="h-4 w-4" />
              Professional Technical Interviews
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              One platform for{" "}
              <span className="bg-gradient-to-r from-brand-600 to-sky-500 bg-clip-text text-transparent">
                smarter hiring
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              MeetSpace replaces scattered interview tools with a unified room
              where performance is captured, reviewed, and turned into
              actionable reports.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login?register=true">
                <Button size="lg" className="min-w-[180px]">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="min-w-[180px]">
                  Log In
                </Button>
              </Link>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-elevated">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-slate-400">
                  meetspace.com/interview/INT-9001
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-3">
                <div className="border-r border-slate-100 p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                    Video
                  </p>
                  <div className="mt-3 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-sky-50">
                    <Video className="h-10 w-10 text-brand-300" />
                  </div>
                </div>
                <div className="border-r border-slate-100 p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                    Code Editor
                  </p>
                  <div className="mt-3 rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400">
                    <p>function twoSum(nums, target) {"{"}</p>
                    <p className="pl-4">const map = new Map();</p>
                    <p className="pl-4 text-slate-500">...</p>
                    <p>{"}"}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
                    Timeline
                  </p>
                  <div className="mt-3 space-y-2">
                    {["00:00 Interview Started", "12:42 First Approach", "23:14 Working Solution"].map(
                      (e) => (
                        <div
                          key={e}
                          className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800"
                        >
                          {e}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Everything in one interview room
            </h2>
            <p className="mt-3 text-slate-600">
              Built for interviewers who need evidence, not guesswork.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 p-6 transition-shadow hover:shadow-elevated"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                From schedule to decision
              </h2>
              <p className="mt-3 text-slate-600">
                A clean flow that mirrors how real hiring teams work.
              </p>
              <ul className="mt-8 space-y-4">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span className="text-slate-700">
                      <span className="font-medium text-brand-700">
                        Step {i + 1}.
                      </span>{" "}
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl gradient-brand p-8 text-white shadow-elevated">
              <h3 className="text-xl font-bold">Ready to streamline interviews?</h3>
              <p className="mt-2 text-brand-100">
                Join MeetSpace and conduct your first technical interview today.
              </p>
              <Link href="/login" className="mt-6 inline-block">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} MeetSpace. Technical interview platform.
        </div>
      </footer>
    </div>
  );
}
