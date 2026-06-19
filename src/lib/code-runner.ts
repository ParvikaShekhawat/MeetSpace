export interface TestCase {
  input: string;
  expected: string;
}

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

export interface RunResult {
  success: boolean;
  results: TestResult[];
  passedCount: number;
  totalCount: number;
}

const TEST_CASES: Record<string, TestCase[]> = {
  "seed-q1": [
    { input: "twoSum([2,7,11,15], 9)", expected: "[0,1]" },
    { input: "twoSum([3,2,4], 6)", expected: "[1,2]" },
    { input: "twoSum([3,3], 6)", expected: "[0,1]" },
  ],
  "seed-q3": [
    { input: 'isValid("()")', expected: "true" },
    { input: 'isValid("()[]{}")', expected: "true" },
    { input: 'isValid("(]")', expected: "false" },
  ],
};

export function getTestCases(questionId: string): TestCase[] {
  return TEST_CASES[questionId] ?? [
    { input: "twoSum([1,2], 3)", expected: "[0,1]" },
  ];
}

export function runJavaScriptTests(
  code: string,
  questionId: string,
  fnName?: string
): RunResult {
  const tests = getTestCases(questionId);
  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      const wrappedCode = `
        ${code}
        return (${test.input});
      `;
      const fn = new Function(wrappedCode);
      const actual = JSON.stringify(fn());
      const passed = normalize(actual) === normalize(test.expected);
      results.push({ passed, input: test.input, expected: test.expected, actual });
    } catch (err) {
      results.push({
        passed: false,
        input: test.input,
        expected: test.expected,
        actual: "Error",
        error: err instanceof Error ? err.message : "Runtime error",
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    success: passedCount === results.length,
    results,
    passedCount,
    totalCount: results.length,
  };
}

function normalize(s: string): string {
  return s.replace(/\s/g, "");
}

export function wrapValidParentheses(code: string): string {
  if (code.includes("function isValid") || code.includes("const isValid")) return code;
  return `${code}

function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if ('({['.includes(char)) stack.push(char);
    else if (char in map) {
      if (stack.pop() !== map[char]) return false;
    }
  }
  return stack.length === 0;
}`;
}
