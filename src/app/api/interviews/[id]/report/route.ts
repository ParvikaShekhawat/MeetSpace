import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: true,
        position: true,
        questions: { include: { question: true }, orderBy: { order: "asc" } },
        events: { orderBy: { timestampMs: "asc" } },
        report: true,
      },
    });

    if (!interview || !interview.report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isInterviewer = interview.position.interviewerId === session.id;
    const isCandidate = interview.candidate.userId === session.id;
    if (!isInterviewer && !isCandidate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = {
      id: interview.id,
      code: interview.code,
      candidateName: interview.candidate.name,
      positionTitle: interview.position.title,
      scheduledAt: interview.scheduledAt.toISOString(),
      durationMins: interview.durationMins,
      overallScore: interview.report.overallScore,
      aiSummary: interview.report.aiSummary,
      strengths: interview.report.strengths,
      weaknesses: interview.report.weaknesses,
      recommendation: interview.report.recommendation,
      interviewerNotes: isInterviewer ? interview.report.interviewerNotes : null,
      interviewerDecision: isInterviewer ? interview.report.interviewerDecision : null,
      finalComments: isInterviewer ? interview.report.finalComments : null,
      questionsSolved: interview.report.questionsSolved,
      hintsUsed: interview.report.hintsUsed,
      questionsAsked: interview.questions.length,
      competencyScores: interview.report.competencyData
        ? JSON.parse(interview.report.competencyData)
        : [],
      learningPlan: interview.report.learningPlanData
        ? JSON.parse(interview.report.learningPlanData)
        : [],
      sectionWiseFeedback: interview.report.sectionWiseFeedback,
      candidateBetterApproach: isCandidate ? interview.report.candidateBetterApproach : null,
      aiGenerated: interview.report.aiGenerated,
      questions: interview.questions.map((iq) => ({
        id: iq.id,
        questionRefId: iq.questionId,
        title: iq.question.title,
        type: iq.question.type,
        difficulty: iq.question.difficulty,
        statement: iq.question.statement,
        finalCode: iq.finalCode,
        notes: isInterviewer ? iq.notes : null,
      })),
      events: interview.events.map((e) => ({
        id: e.id,
        timestampMs: e.timestampMs,
        type: e.type,
        payload: JSON.parse(e.payload || "{}"),
      })),
      role: session.role,
    };

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== "INTERVIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { position: true },
    });

    if (!interview || interview.position.interviewerId !== session.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const report = await prisma.interviewReport.update({
      where: { interviewId: id },
      data: {
        interviewerDecision: body.interviewerDecision,
        finalComments: body.finalComments,
        interviewerNotes: body.interviewerNotes,
        recommendation: body.recommendation,
      },
    });

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
