interface AnalysisEvent {
  type: string;
  timestampMs: number;
  payload: Record<string, string>;
}

interface AnalysisQuestion {
  title: string;
  type: string;
  finalCode: string | null;
}

export interface GeneratedAnalysis {
  overallScore: number;
  aiSummary: string;
  strengths: string;
  weaknesses: string;
  recommendation: string;
  questionsSolved: number;
  hintsUsed: number;
  communicationScore: number;
  competencyScores: Array<{
    name: string;
    score: number;
    evidence: string;
  }>;
  learningPlan: Array<{
    topic: string;
    priority: string;
    action: string;
    hours: number;
  }>;
  timelineHighlights: Array<{
    timestampMs: number;
    label: string;
    observation: string;
  }>;
  sectionWiseFeedback?: string;
  candidateBetterApproach?: string;
}

export function generateInterviewAnalysis(
  events: AnalysisEvent[],
  questions: AnalysisQuestion[],
  durationMins: number
): GeneratedAnalysis {
  const hints = events.filter((e) => e.type === "HINT");
  const flags = events.filter((e) => e.type === "FLAG");
  const notes = events.filter((e) => e.type === "NOTE");
  const codeChanges = events.filter((e) => e.type === "CODE_CHANGE");
  const positiveFlags = flags.filter((f) =>
    ["Strong Answer", "Good Insight", "Optimization Found"].includes(f.payload.flag ?? "")
  );
  const negativeFlags = flags.filter((f) =>
    ["Hint Needed", "Missed Edge Case", "Communication Issue"].includes(f.payload.flag ?? "")
  );

  const solved = questions.filter((q) => q.finalCode && q.finalCode.length > 30).length;
  const hintsUsed = hints.length;

  let score = 55 + solved * 14 + positiveFlags.length * 4 - hintsUsed * 6 - negativeFlags.length * 5;
  score = Math.max(35, Math.min(96, score));

  const recommendation =
    score >= 85 ? "Strong Hire" : score >= 72 ? "Hire" : score >= 58 ? "Borderline" : "Reject";

  const strengths: string[] = [];
  if (solved >= 2) strengths.push("Strong problem-solving across multiple questions");
  if (positiveFlags.length > 0) strengths.push("Demonstrated strong insights during the session");
  if (codeChanges.length > 5) strengths.push("Active coding with iterative refinement");
  if (notes.some((n) => n.payload.text?.toLowerCase().includes("communication")))
    strengths.push("Clear communication noted by interviewer");
  if (strengths.length === 0) strengths.push("Engaged throughout the interview session");

  const weaknesses: string[] = [];
  if (hintsUsed > 0) weaknesses.push(`Required ${hintsUsed} hint(s) during problem solving`);
  if (negativeFlags.some((f) => f.payload.flag === "Missed Edge Case"))
    weaknesses.push("Missed edge cases in at least one question");
  if (solved < questions.length) weaknesses.push(`${questions.length - solved} question(s) incomplete`);
  if (questions.some((q) => q.type === "SYSTEM_DESIGN") && solved < questions.length)
    weaknesses.push("System design depth could improve");
  if (weaknesses.length === 0) weaknesses.push("Minor optimization opportunities in complexity discussion");

  const aiSummary = [
    `Candidate attempted ${questions.length} question(s) over ${durationMins} minutes.`,
    solved >= questions.length
      ? "All coding questions reached working solutions."
      : `Completed ${solved}/${questions.length} questions with substantive code.`,
    hintsUsed > 0
      ? `Interviewer provided ${hintsUsed} hint(s), suggesting some dependency on guidance.`
      : "Minimal hints required — strong independent problem solving.",
    positiveFlags.length > negativeFlags.length
      ? "Timeline flags indicate more strengths than concerns."
      : "Some areas flagged for follow-up during the session.",
  ].join(" ");

  const communicationScore = Math.min(
    10,
    Math.max(5, 7 + positiveFlags.length - negativeFlags.length + (notes.length > 2 ? 1 : 0))
  );

  const competencyScores = [
    {
      name: "Problem Solving",
      score: Math.min(10, 6 + solved * 2 - hintsUsed),
      evidence: `${solved} questions solved with ${codeChanges.length} code revisions`,
    },
    {
      name: "Communication",
      score: communicationScore,
      evidence: `${notes.length} timeline notes, ${flags.length} flags recorded`,
    },
    {
      name: "Code Quality",
      score: Math.min(10, 5 + (solved > 0 ? 3 : 0) + (codeChanges.length > 3 ? 2 : 0)),
      evidence: "Based on final code snapshots and revision patterns",
    },
    {
      name: "Edge Case Handling",
      score: negativeFlags.some((f) => f.payload.flag === "Missed Edge Case") ? 5 : 8,
      evidence: negativeFlags.some((f) => f.payload.flag === "Missed Edge Case")
        ? "Edge case flag raised during interview"
        : "No edge case issues flagged",
    },
  ];

  const learningPlan = [];
  if (hintsUsed > 0) {
    learningPlan.push({
      topic: "Optimization & Complexity",
      priority: "High",
      action: "Practice 5 problems focusing on time/space tradeoffs after hints",
      hours: 4,
    });
  }
  if (questions.some((q) => q.title.includes("LRU") || q.title.includes("Cache"))) {
    learningPlan.push({
      topic: "Data Structures",
      priority: "Medium",
      action: "Study HashMap + Linked List patterns (LRU, LFU)",
      hours: 3,
    });
  }
  if (questions.some((q) => q.type === "SYSTEM_DESIGN")) {
    learningPlan.push({
      topic: "System Design",
      priority: "High",
      action: "Review caching, load balancing, and URL shortener designs",
      hours: 6,
    });
  }
  if (learningPlan.length === 0) {
    learningPlan.push({
      topic: "Advanced DSA",
      priority: "Medium",
      action: "Practice 3 medium-hard array and graph problems",
      hours: 5,
    });
  }

  const timelineHighlights = events
    .filter((e) => ["FLAG", "HINT", "NOTE", "QUESTION_STARTED", "CODE_CHANGE"].includes(e.type))
    .slice(0, 12)
    .map((e) => ({
      timestampMs: e.timestampMs,
      label: formatEventLabel(e),
      observation: formatEventObservation(e),
    }));

  return {
    overallScore: score,
    aiSummary,
    strengths: strengths.join("\n"),
    weaknesses: weaknesses.join("\n"),
    recommendation,
    questionsSolved: solved,
    hintsUsed,
    communicationScore,
    competencyScores,
    learningPlan,
    timelineHighlights,
    sectionWiseFeedback: `1. Setup: Good\n2. Implementation: Solid\n3. Edge Cases: Needs Work\n4. Complexity: Optimal`,
    candidateBetterApproach: `Instead of O(N^2), try using a Hash Map for O(N) lookup time.`,
  };
}

function formatEventLabel(e: AnalysisEvent): string {
  switch (e.type) {
    case "QUESTION_STARTED":
      return `Question: ${e.payload.title ?? "Started"}`;
    case "HINT":
      return "Hint Given";
    case "FLAG":
      return e.payload.flag ?? "Flag";
    case "NOTE":
      return "Interviewer Note";
    case "CODE_CHANGE":
      return "Code Updated";
    default:
      return e.type.replace(/_/g, " ");
  }
}

function formatEventObservation(e: AnalysisEvent): string {
  if (e.payload.text) return e.payload.text;
  if (e.payload.flag) return `Flagged: ${e.payload.flag}`;
  if (e.type === "CODE_CHANGE") return "Candidate revised their solution";
  if (e.type === "QUESTION_STARTED") return "New question phase began";
  return "Notable moment in the interview";
}
