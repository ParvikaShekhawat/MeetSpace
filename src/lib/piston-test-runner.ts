import { executeViaPiston, LanguageId } from "./piston";
import { getTestCases, TestCase } from "./code-runner";

export async function runMultiLanguageTests(
  code: string,
  language: LanguageId,
  questionId: string
) {
  const tests = getTestCases(questionId);
  const wrappedCode = wrapCodeForTests(code, language, questionId, tests);

  const res = await executeViaPiston(wrappedCode, language);

  if (!res.success && !res.stdout && res.stderr) {
    return {
      success: false,
      results: tests.map((t) => ({
        passed: false,
        input: t.input,
        expected: t.expected,
        actual: "Compilation / Execution Error",
        error: res.stderr,
      })),
      passedCount: 0,
      totalCount: tests.length,
    };
  }

  const stdout = res.stdout;
  const marker = "===TEST_START===";
  const markerIdx = stdout.indexOf(marker);

  if (markerIdx === -1) {
    return {
      success: false,
      results: tests.map((t) => ({
        passed: false,
        input: t.input,
        expected: t.expected,
        actual: "Runtime Error",
        error: res.stderr || stdout || "Did not execute tests.",
      })),
      passedCount: 0,
      totalCount: tests.length,
    };
  }

  const lines = stdout.substring(markerIdx + marker.length).trim().split(/\r?\n/);
  const results = tests.map((test, idx) => {
    const line = lines[idx] ? lines[idx].trim() : "";
    if (line.startsWith("ERROR:")) {
      return {
        passed: false,
        input: test.input,
        expected: test.expected,
        actual: "Exception",
        error: line.substring(6).trim(),
      };
    }
    const passed = normalize(line) === normalize(test.expected);
    return {
      passed,
      input: test.input,
      expected: test.expected,
      actual: line || "No Output",
    };
  });

  const passedCount = results.filter((r) => r.passed).length;
  return {
    success: passedCount === tests.length,
    results,
    passedCount,
    totalCount: tests.length,
  };
}

function normalize(s: string): string {
  return s.replace(/\s/g, "").replace(/["']/g, "").toLowerCase();
}

function wrapCodeForTests(
  code: string,
  language: LanguageId,
  questionId: string,
  tests: TestCase[]
): string {
  const isTwoSum = questionId === "seed-q1" || questionId.includes("q1");
  const isValidParentheses = questionId === "seed-q3" || questionId.includes("q3");

  if (language === "javascript" || language === "typescript") {
    return `
${code}

if (typeof twoSum === 'undefined' && typeof two_sum !== 'undefined') {
  var twoSum = two_sum;
}
if (typeof isValid === 'undefined' && typeof is_valid !== 'undefined') {
  var isValid = is_valid;
}

console.log("===TEST_START===");
${tests
  .map(
    (t) => `
try {
  console.log(JSON.stringify(${t.input}));
} catch(e) {
  console.log("ERROR: " + e.message);
}
`
  )
  .join("\n")}
`;
  }

  if (language === "python") {
    return `
${code}

if 'twoSum' not in globals() and 'two_sum' in globals():
    twoSum = two_sum
if 'isValid' not in globals() and 'is_valid' in globals():
    isValid = is_valid

import json
print("===TEST_START===")
${tests
  .map(
    (t) => `
try {
    val = ${t.input}
    print(json.dumps(val))
except Exception as e:
    print("ERROR: " + str(e))
`
  )
  .join("\n")}
`;
  }

  if (language === "java") {
    if (isTwoSum) {
      return `
import java.util.*;
${code}

public class Main {
    public static void main(String[] args) {
        System.out.println("===TEST_START===");
        try {
            Solution solver = new Solution();
            int[] r1 = solver.twoSum(new int[]{2,7,11,15}, 9);
            System.out.println(Arrays.toString(r1).replace(" ", ""));
            int[] r2 = solver.twoSum(new int[]{3,2,4}, 6);
            System.out.println(Arrays.toString(r2).replace(" ", ""));
            int[] r3 = solver.twoSum(new int[]{3,3}, 6);
            System.out.println(Arrays.toString(r3).replace(" ", ""));
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
        }
    }
}
`;
    }

    if (isValidParentheses) {
      return `
import java.util.*;
${code}

public class Main {
    public static void main(String[] args) {
        System.out.println("===TEST_START===");
        try {
            Solution solver = new Solution();
            System.out.println(solver.isValid("()"));
            System.out.println(solver.isValid("()[]{}"));
            System.out.println(solver.isValid("(]"));
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
        }
    }
}
`;
    }

    return `
import java.util.*;
${code}

public class Main {
    public static void main(String[] args) {
        System.out.println("===TEST_START===");
        try {
            Solution solver = new Solution();
            int[] r1 = solver.twoSum(new int[]{1,2}, 3);
            System.out.println(Arrays.toString(r1).replace(" ", ""));
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
        }
    }
}
`;
  }

  if (language === "cpp") {
    if (isTwoSum) {
      return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

${code}

int main() {
    cout << "===TEST_START===" << endl;
    try {
        Solution solver;
        auto r1 = solver.twoSum({2,7,11,15}, 9);
        cout << "[" << r1[0] << "," << r1[1] << "]" << endl;
        auto r2 = solver.twoSum({3,2,4}, 6);
        cout << "[" << r2[0] << "," << r2[1] << "]" << endl;
        auto r3 = solver.twoSum({3,3}, 6);
        cout << "[" << r3[0] << "," << r3[1] << "]" << endl;
    } catch (const exception& e) {
        cout << "ERROR: " << e.what() << endl;
    }
    return 0;
}
`;
    }

    if (isValidParentheses) {
      return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

${code}

int main() {
    cout << "===TEST_START===" << endl;
    try {
        Solution solver;
        cout << (solver.isValid("()") ? "true" : "false") << endl;
        cout << (solver.isValid("()[]{}") ? "true" : "false") << endl;
        cout << (solver.isValid("(]") ? "true" : "false") << endl;
    } catch (const exception& e) {
        cout << "ERROR: " << e.what() << endl;
    }
    return 0;
}
`;
    }

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

${code}

int main() {
    cout << "===TEST_START===" << endl;
    try {
        Solution solver;
        auto r1 = solver.twoSum({1,2}, 3);
        cout << "[" << r1[0] << "," << r1[1] << "]" << endl;
    } catch (const exception& e) {
        cout << "ERROR: " << e.what() << endl;
    }
    return 0;
}
`;
  }

  if (language === "go") {
    if (isTwoSum) {
      return `
package main
import (
    "fmt"
    "encoding/json"
)

${code}

func main() {
    fmt.Println("===TEST_START===")
    r1, _ := json.Marshal(twoSum([]int{2,7,11,15}, 9))
    fmt.Println(string(r1))
    r2, _ := json.Marshal(twoSum([]int{3,2,4}, 6))
    fmt.Println(string(r2))
    r3, _ := json.Marshal(twoSum([]int{3,3}, 6))
    fmt.Println(string(r3))
}
`;
    }

    if (isValidParentheses) {
      return `
package main
import (
    "fmt"
)

${code}

func main() {
    fmt.Println("===TEST_START===")
    fmt.Println(isValid("()"))
    fmt.Println(isValid("()[]{}"))
    fmt.Println(isValid("(]"))
}
`;
    }

    return `
package main
import (
    "fmt"
    "encoding/json"
)

${code}

func main() {
    fmt.Println("===TEST_START===")
    r1, _ := json.Marshal(twoSum([]int{1,2}, 3))
    fmt.Println(string(r1))
}
`;
  }

  return code;
}
