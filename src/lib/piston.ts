export interface PistonResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionEngine: "piston" | "local";
}

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

export const SUPPORTED_LANGUAGES = [
  { id: "javascript", label: "JavaScript", pistonLang: "javascript", version: "18.15.0" },
  { id: "typescript", label: "TypeScript", pistonLang: "typescript", version: "5.0.3" },
  { id: "python", label: "Python", pistonLang: "python", version: "3.10.0" },
  { id: "java", label: "Java", pistonLang: "java", version: "15.0.2" },
  { id: "cpp", label: "C++", pistonLang: "c++", version: "10.2.0" },
  { id: "go", label: "Go", pistonLang: "go", version: "1.16.2" },
  { id: "rust", label: "Rust", pistonLang: "rust", version: "1.68.2" },
  { id: "ruby", label: "Ruby", pistonLang: "ruby", version: "3.2.2" },
  { id: "php", label: "PHP", pistonLang: "php", version: "8.2.3" },
  { id: "csharp", label: "C#", pistonLang: "csharp", version: "6.12.0" },
] as const;

export type LanguageId = (typeof SUPPORTED_LANGUAGES)[number]["id"];

export async function executeViaPiston(
  code: string,
  language: LanguageId,
  stdin?: string
): Promise<ExecuteResult> {
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === language);
  if (!langConfig) {
    return { success: false, stdout: "", stderr: "Unsupported language", exitCode: 1, executionEngine: "piston" };
  }

  try {
    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.pistonLang,
        version: langConfig.version,
        files: [{ name: getFileName(language), content: code }],
        stdin: stdin ?? "",
        run_timeout: 5000,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        stdout: "",
        stderr: `Piston API error: ${res.status}`,
        exitCode: 1,
        executionEngine: "piston",
      };
    }

    const data: PistonResult = await res.json();
    return {
      success: data.run.code === 0,
      stdout: data.run.stdout,
      stderr: data.run.stderr,
      exitCode: data.run.code,
      executionEngine: "piston",
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: err instanceof Error ? err.message : "Execution failed",
      exitCode: 1,
      executionEngine: "piston",
    };
  }
}

function getFileName(language: LanguageId): string {
  const map: Record<LanguageId, string> = {
    javascript: "main.js",
    typescript: "main.ts",
    python: "main.py",
    java: "Main.java",
    cpp: "main.cpp",
    go: "main.go",
    rust: "main.rs",
    ruby: "main.rb",
    php: "main.php",
    csharp: "main.cs",
  };
  return map[language];
}

export function wrapCodeForExecution(code: string, language: LanguageId, testInput?: string): string {
  if (language === "javascript" && testInput) {
    return `${code}\nconsole.log(JSON.stringify(${testInput}));`;
  }
  if (language === "python" && testInput) {
    return `${code}\nimport json\nprint(json.dumps(${testInput.replace(/twoSum/g, "two_sum")}))`;
  }
  return code;
}
