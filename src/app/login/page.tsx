"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("register") === "true";

  const [mode, setMode] = useState<"login" | "register">(
    isRegister ? "register" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "INTERVIEWER",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email: form.email, password: form.password }
        : form;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      const role = data.user.role;
      router.push(
        role === "INTERVIEWER"
          ? "/interviewer/dashboard"
          : "/candidate/dashboard"
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 gradient-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Video className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">MeetSpace</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">
            Conduct interviews with confidence
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            One room. One link. Complete performance capture from start to
            hiring decision.
          </p>
        </div>
        <p className="text-sm text-brand-200">
          Demo accounts seeded on first setup — see README.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
                <Video className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-brand-900">MeetSpace</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login"
              ? "Sign in to access your dashboard"
              : "Register as an interviewer or candidate"}
          </p>

          <div className="mt-6 flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-brand-700"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-brand-700"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <Input
                  id="name"
                  label="Full Name"
                  placeholder="Alex Morgan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Select
                  id="role"
                  label="I am a"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="INTERVIEWER">Interviewer</option>
                  <option value="CANDIDATE">Candidate</option>
                </Select>
              </>
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="text-brand-600 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
