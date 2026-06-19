import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { executeViaPiston, SUPPORTED_LANGUAGES, type LanguageId } from "@/lib/piston";
import { runMultiLanguageTests } from "@/lib/piston-test-runner";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, language, questionId, mode } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const lang = (language || "javascript") as LanguageId;

    if (mode === "tests") {
      const result = await runMultiLanguageTests(code, lang, questionId || "seed-q1");
      return NextResponse.json({
        mode: "tests",
        ...result,
        executionEngine: "piston",
      });
    }

    const pistonResult = await executeViaPiston(code, lang);
    return NextResponse.json({
      mode: "run",
      success: pistonResult.success,
      stdout: pistonResult.stdout,
      stderr: pistonResult.stderr,
      exitCode: pistonResult.exitCode,
      executionEngine: pistonResult.executionEngine,
      language: lang,
    });
  } catch {
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
}
