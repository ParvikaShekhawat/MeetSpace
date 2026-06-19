export interface QuestionData {
  id: string;
  order: number;
  finalCode: string | null;
  workspaceData: string | null;
  question: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    statement: string;
    constraints: string | null;
    hints: string | null;
    metadata: string | null;
  };
}

export interface LayoutContext {
  question: QuestionData;
  code: string;
  workspaceData: Record<string, unknown>;
  language: string;
  readOnly: boolean;
  onCodeChange: (code: string) => void;
  onWorkspaceChange: (data: Record<string, unknown>) => void;
  onLanguageChange?: (language: string) => void;
  onRunTests?: () => void;
  onRunCode?: () => void;
  testResults?: Array<{
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }> | null;
  runOutput?: { stdout: string; stderr: string; success: boolean } | null;
  running?: boolean;
  syncConnected?: boolean;
}

export type QuestionLayoutComponent = React.ComponentType<{ ctx: LayoutContext }>;

export const DEFAULT_CODE = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;

export const DEFAULT_SQL = `-- Write your SQL query here
SELECT customer_id, COUNT(*) as order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 3;`;

export function parseWorkspaceData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
