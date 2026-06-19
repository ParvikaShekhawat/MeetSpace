import Link from "next/link";
import { Video } from "lucide-react";

interface NavbarProps {
  user?: { name: string; role: string } | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-sky-500 shadow-sm">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-brand-900">
            MeetSpace
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.name}
              </span>
              <Link
                href={
                  user.role === "INTERVIEWER"
                    ? "/interviewer/dashboard"
                    : "/candidate/dashboard"
                }
                className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Dashboard
              </Link>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Log in
              </Link>
              <Link
                href="/login?register=true"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
