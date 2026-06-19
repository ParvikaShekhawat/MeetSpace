export type Recommendation = "Strong Hire" | "Hire" | "Borderline" | "Reject";

export interface InterviewEventPayload {
  text?: string;
  questionId?: string;
  code?: string;
  flag?: string;
}

export interface DashboardInterview {
  id: string;
  code: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  candidateName: string;
  positionTitle: string;
}

export interface ReportData {
  id: string;
  code: string;
  candidateName: string;
  positionTitle: string;
  scheduledAt: string;
  durationMins: number;
  overallScore: number;
  aiSummary: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendation: string;
  interviewerNotes: string | null;
  interviewerDecision: string | null;
  finalComments: string | null;
  questionsSolved: number;
  hintsUsed: number;
  questionsAsked: number;
  questions: Array<{
    id: string;
    questionRefId?: string;
    title: string;
    type: string;
    difficulty: string;
    statement: string;
    finalCode: string | null;
    notes: string | null;
  }>;
  events: Array<{
    id: string;
    timestampMs: number;
    type: string;
    payload: InterviewEventPayload;
  }>;
  competencyScores?: Array<{ name: string; score: number; evidence: string }>;
  learningPlan?: Array<{ topic: string; priority: string; action: string; hours: number }>;
  sectionWiseFeedback?: string | null;
  candidateBetterApproach?: string | null;
  aiGenerated?: boolean;
  role?: string;
}
