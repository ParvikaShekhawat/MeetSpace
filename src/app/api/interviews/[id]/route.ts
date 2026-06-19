import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { generateReportWithAI } from "@/lib/openai-report";
import { revalidatePath } from "next/cache";

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
        questions: {
          include: { question: true },
          orderBy: { order: "asc" },
        },
        events: { orderBy: { timestampMs: "asc" } },
        report: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isInterviewer = interview.position.interviewerId === session.id;
    const isCandidate = interview.candidate.userId === session.id;

    if (!isInterviewer && !isCandidate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(interview);
  } catch {
    return NextResponse.json({ error: "Failed to fetch interview" }, { status: 500 });
  }
}

export async function PATCH(
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
      include: { position: true, candidate: true },
    });

    if (!interview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isInterviewer = interview.position.interviewerId === session.id;
    const isCandidate = interview.candidate.userId === session.id;

    if (!isInterviewer && !isCandidate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      const updated = await prisma.interview.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: interview.startedAt ?? new Date(),
        },
      });
      await prisma.interviewEvent.create({
        data: {
          interviewId: id,
          type: "INTERVIEW_STARTED",
          timestampMs: 0,
          payload: JSON.stringify({ by: session.name }),
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "end") {
      const questions = await prisma.interviewQuestion.findMany({
        where: { interviewId: id },
        include: { question: true },
      });

      // Persist latest room state before analysis
      const roomStates = await prisma.roomState.findMany({ where: { interviewId: id } });
      for (const state of roomStates) {
        await prisma.interviewQuestion.updateMany({
          where: { interviewId: id, questionId: state.questionId },
          data: {
            finalCode: state.code ?? undefined,
            workspaceData: state.workspaceData ?? undefined,
          },
        });
      }

      const refreshedQuestions = await prisma.interviewQuestion.findMany({
        where: { interviewId: id },
        include: { question: true },
      });

      const events = await prisma.interviewEvent.findMany({ where: { interviewId: id } });

      const analysis = await generateReportWithAI({
        candidateName: interview.candidate.name,
        positionTitle: interview.position.title,
        durationMins: interview.durationMins,
        events: events.map((e) => ({
          type: e.type,
          timestampMs: e.timestampMs,
          payload: JSON.parse(e.payload || "{}"),
        })),
        questions: refreshedQuestions.map((q) => ({
          title: q.question.title,
          type: q.question.type,
          finalCode: q.finalCode,
        })),
      });

      const updated = await prisma.interview.update({
        where: { id },
        data: { status: "COMPLETED", endedAt: new Date() },
      });

      await prisma.interviewEvent.create({
        data: {
          interviewId: id,
          type: "INTERVIEW_ENDED",
          timestampMs: body.elapsedMs ?? 0,
          payload: JSON.stringify({ by: session.name }),
        },
      });

      await prisma.interviewReport.upsert({
        where: { interviewId: id },
        create: {
          interviewId: id,
          overallScore: analysis.overallScore,
          questionsSolved: analysis.questionsSolved,
          hintsUsed: analysis.hintsUsed,
          aiSummary: analysis.aiSummary,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendation: analysis.recommendation,
          competencyData: JSON.stringify(analysis.competencyScores),
          learningPlanData: JSON.stringify(analysis.learningPlan),
          aiGenerated: analysis.aiGenerated,
          interviewerNotes: "",
        },
        update: {
          overallScore: analysis.overallScore,
          questionsSolved: analysis.questionsSolved,
          hintsUsed: analysis.hintsUsed,
          aiSummary: analysis.aiSummary,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendation: analysis.recommendation,
          competencyData: JSON.stringify(analysis.competencyScores),
          learningPlanData: JSON.stringify(analysis.learningPlan),
          aiGenerated: analysis.aiGenerated,
        },
      });

      revalidatePath("/candidate/dashboard");
      revalidatePath("/interviewer/dashboard");

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 });
  }
}
