import { generateInterviewAnalysis, type GeneratedAnalysis } from "./ai-analysis";

interface ReportContext {
  candidateName: string;
  positionTitle: string;
  durationMins: number;
  events: Array<{ type: string; timestampMs: number; payload: Record<string, string> }>;
  questions: Array<{ title: string; type: string; finalCode: string | null }>;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function generateReportWithAI(
  context: ReportContext
): Promise<GeneratedAnalysis & { aiGenerated: boolean }> {
  const fallback = generateInterviewAnalysis(
    context.events,
    context.questions,
    context.durationMins
  );

  if (!isOpenAIConfigured()) {
    return { ...fallback, aiGenerated: false };
  }

  try {
    const aiResult = await callOpenAI(context);
    return { ...aiResult, aiGenerated: true };
  } catch (err) {
    console.error("OpenAI report failed, using heuristic:", err);
    return { ...fallback, aiGenerated: false };
  }
}

async function callOpenAI(context: ReportContext): Promise<GeneratedAnalysis> {
  const fallback = generateInterviewAnalysis(
    context.events,
    context.questions,
    context.durationMins
  );

  const timelineText = context.events
    .slice(0, 30)
    .map((e) => {
      const ts = formatTs(e.timestampMs);
      const detail = e.payload.text || e.payload.flag || e.payload.title || "";
      return `[${ts}] ${e.type}${detail ? `: ${detail}` : ""}`;
    })
    .join("\n");

  const questionsText = context.questions
    .map((q) => `- ${q.title} (${q.type}): ${q.finalCode ? "code submitted" : "no code"}`)
    .join("\n");

  const prompt = `You are an expert technical interview evaluator. Analyze this interview and respond ONLY with valid JSON.

Candidate: ${context.candidateName}
Position: ${context.positionTitle}
Duration: ${context.durationMins} minutes

Questions:
${questionsText}

Timeline Events:
${timelineText}

Respond with this exact JSON structure:
{
  "overallScore": <number 0-100>,
  "aiSummary": "<2-3 sentence summary citing specific timeline moments>",
  "strengths": "<newline-separated strengths with timestamp references like 12:42>",
  "weaknesses": "<newline-separated weaknesses with evidence>",
  "recommendation": "<Strong Hire|Hire|Borderline|Reject>",
  "questionsSolved": <number>,
  "hintsUsed": <number>,
  "communicationScore": <number 1-10>,
  "competencyScores": [
    {"name": "Problem Solving", "score": <1-10>, "evidence": "<specific evidence>"},
    {"name": "Communication", "score": <1-10>, "evidence": "<specific evidence>"},
    {"name": "Code Quality", "score": <1-10>, "evidence": "<specific evidence>"},
    {"name": "Edge Case Handling", "score": <1-10>, "evidence": "<specific evidence>"}
  ],
  "learningPlan": [
    {"topic": "<topic>", "priority": "<High|Medium|Low>", "action": "<specific action>", "hours": <number>}
  ],
  "timelineHighlights": [
    {"timestampMs": <number>, "label": "<short label>", "observation": "<what happened>"}
  ],
  "sectionWiseFeedback": "<Detailed section-wise feedback. E.g. 1. Code setup: Good. 2. Implementation: Solid. 3. Edge Cases: Missed null checks.>",
  "candidateBetterApproach": "<A direct, friendly explanation meant for the candidate on a better approach to solve the problems they struggled with.>"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a technical interview analyst. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const parsed = JSON.parse(content) as GeneratedAnalysis;

  return {
    overallScore: clamp(parsed.overallScore ?? fallback.overallScore, 0, 100),
    aiSummary: parsed.aiSummary || fallback.aiSummary,
    strengths: parsed.strengths || fallback.strengths,
    weaknesses: parsed.weaknesses || fallback.weaknesses,
    recommendation: parsed.recommendation || fallback.recommendation,
    questionsSolved: parsed.questionsSolved ?? fallback.questionsSolved,
    hintsUsed: parsed.hintsUsed ?? fallback.hintsUsed,
    communicationScore: parsed.communicationScore ?? fallback.communicationScore,
    competencyScores: parsed.competencyScores?.length ? parsed.competencyScores : fallback.competencyScores,
    learningPlan: parsed.learningPlan?.length ? parsed.learningPlan : fallback.learningPlan,
    timelineHighlights: parsed.timelineHighlights?.length
      ? parsed.timelineHighlights
      : fallback.timelineHighlights,
    sectionWiseFeedback: parsed.sectionWiseFeedback || fallback.sectionWiseFeedback,
    candidateBetterApproach: parsed.candidateBetterApproach || fallback.candidateBetterApproach,
  };
}

function formatTs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
